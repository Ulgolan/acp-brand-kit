"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import pkg from "../package.json";

const STORAGE_KEY = "claude-dashboard-cards";

// Brand threads: navy / peri / pink / yellow — plus vermilion on exactly one
// tag. RA-2: the design wins over the old comment. Vermilion is the single
// accent of a view (Import CTA + spotlight rail), and #jobhunt is the one thread
// allowed to borrow it — the urgent thread. No other tag may.
const TAG_COLORS: Record<string, string> = {
  "#career": "#080B83",
  "#vibecode": "#6F7BFF",
  "#cyoa": "#F487B6",
  "#creative": "#FDE12D",
  "#alexandra": "#F487B6",
  "#business": "#080B83",
  "#jobhunt": "#FF4D00",   // the one urgent thread
  "#learning": "#6F7BFF",
  "#portfolio": "#6F7BFF",
  "#ai": "#FDE12D",
};
const THREAD_FALLBACK = ["#080B83", "#6F7BFF", "#F487B6", "#FDE12D"];

function getTagColor(tag: string): string {
  if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash << 5) - hash + tag.charCodeAt(i);
  return THREAD_FALLBACK[Math.abs(hash) % THREAD_FALLBACK.length];
}

// Appending "22" only ever produced a valid color for the hex swatches in
// TAG_COLORS — an unknown tag falls back to hsl(), where "hsl(...)22" is simply
// invalid and the pill renders transparent. color-mix is valid for both.
function getTagBg(tag: string): string {
  return `color-mix(in srgb, ${getTagColor(tag)} 13%, transparent)`;
}

// The pill's 1px thread-tinted ring. The thread colour is allowed on the swatch
// and on this ring — never on the label. Navy text on a faint tint is the
// contrast rule: a #FDE12D label on ivory would be unreadable.
function getTagEdge(tag: string): string {
  return `color-mix(in srgb, ${getTagColor(tag)} 34%, transparent)`;
}

// RA-3: one pill, one definition, so the swatch and the navy-text rule cannot
// drift between the four render sites. `compact` is the backlog/preview size.
function TagPill({ tag, compact = false }: { tag: string; compact?: boolean }) {
  return (
    <span
      className="font-mono inline-flex items-center align-middle"
      style={{
        gap: compact ? 4 : 5,
        fontSize: compact ? "0.56rem" : "0.62rem",
        letterSpacing: compact ? "0.04em" : "0.05em",
        padding: compact ? "1px 7px 1px 5px" : "2px 9px 2px 7px",
        borderRadius: "100px",
        color: "var(--text-primary)",
        background: getTagBg(tag),
        border: `1px solid ${getTagEdge(tag)}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: compact ? 6 : 7,
          height: compact ? 6 : 7,
          borderRadius: 2,
          background: getTagColor(tag),
          flex: "none",
        }}
      />
      {tag}
    </span>
  );
}

// RA-3, fourth site. The preview's tag line is produced by previewField as a
// STRING, and that resolution logic (parsed wins / "(kept)" / default) is left
// exactly as it was. This only re-presents the string it returns: real tags
// become pills with their swatch, everything else — "no tags", the "(kept)"
// marker — stays plain text.
function renderPreviewTags(value: string) {
  const KEPT = " (kept)";
  const kept = value.endsWith(KEPT);
  const body = kept ? value.slice(0, -KEPT.length) : value;
  const tokens = body.split(", ").filter(Boolean);
  return (
    <>
      {tokens.map((token, i) =>
        token.startsWith("#") ? (
          <TagPill key={`${token}-${i}`} tag={token} compact />
        ) : (
          <span key={`${token}-${i}`}>{token}</span>
        )
      )}
      {kept && <span className="opacity-70">(kept)</span>}
    </>
  );
}

function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

function renderTextWithLinks(text: string, maxDisplayLength: number) {
  const parts: any[] = [];
  const urlRegex = /https?:\/\/[^\s]+/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    const display =
      url.length > maxDisplayLength ? `${url.slice(0, maxDisplayLength - 3)}...` : url;
    parts.push(
      <a
        key={`${url}-${start}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--peri)",
          fontSize: "12px",
          textDecoration: "none",
        }}
        className="hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {display}
      </a>
    );
    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

type ChecklistItem = { text: string; done: boolean };

export type Card = {
  id: string;
  slug: string;
  zone: "spotlight" | "backlog";
  title: string;
  type: "summary" | "checklist";
  content: string;
  checklist: ChecklistItem[];
  chatLink: string | null;
  tags: string[];
  date: string;
};

const SEED: Card[] = [
  {
    id: "s1",
    slug: "swiss-job-apps",
    zone: "spotlight",
    title: "Swiss Job Applications",
    type: "summary",
    content:
      "Active pipeline: Groupe Mutuel, Lombard Odier, BCV. Strategy: high-volume + precision custom landing pages. Focus on 10k+ CHF roles.",
    chatLink: "https://claude.ai/chat/9d17910d",
    tags: ["#jobhunt", "#career"],
    date: "Feb 11",
    checklist: [],
  },
  {
    id: "s2",
    slug: "portfolio-vibecode",
    zone: "spotlight",
    title: "Portfolio → Vibecoded Site",
    type: "summary",
    content:
      "Migrate from Notion/Super.so to custom vibecoded portfolio on Vercel. Pipeline set up. Next: Figma wireframes, then vibecode.",
    chatLink: "https://claude.ai/chat/d311e13b",
    tags: ["#portfolio", "#vibecode", "#career"],
    date: "Feb 11",
    checklist: [],
  },
  {
    id: "s3",
    slug: "dashboard-project",
    zone: "spotlight",
    title: "Dashboard Project",
    type: "checklist",
    content: "",
    checklist: [
      { text: "Wireframe layout in Figma", done: true },
      { text: "Review polished prototype", done: true },
      { text: "Build import parser", done: true },
      { text: "Create export skill", done: true },
      { text: "Deploy on Vercel", done: true },
      { text: "Add drag-and-drop", done: true },
    ],
    chatLink: null,
    tags: ["#vibecode", "#portfolio"],
    date: "Feb 19",
  },
  {
    id: "b1",
    slug: "hotico-geneva",
    zone: "backlog",
    title: "HOTICO Geneva Launch",
    type: "summary",
    content:
      "Local SEO + regulatory research for Alexandra's dermopigmentation expansion.",
    tags: ["#alexandra", "#business"],
    date: "Feb 5",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b2",
    slug: "symbaroum-cyoa",
    zone: "backlog",
    title: "Symbaroum CYOA Rehaul",
    type: "summary",
    content: "26-annex system complete. Tighten mechanical loops and flow testing.",
    tags: ["#cyoa", "#creative"],
    date: "Feb 8",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b3",
    slug: "cyberpunk-red-cyoa",
    zone: "backlog",
    title: "Cyberpunk RED CYOA",
    type: "summary",
    content: "Core rulebook + 10 supplements in NotebookLM. Extraction phase next.",
    tags: ["#cyoa", "#creative"],
    date: "Feb 3",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b4",
    slug: "alien-rpg-cyoa",
    zone: "backlog",
    title: "ALIEN RPG CYOA",
    type: "summary",
    content: "Completed — 22 annexes, tested flow. Could use a polish pass.",
    tags: ["#cyoa", "#creative"],
    date: "Jan 28",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b5",
    slug: "twilight-2000-cyoa",
    zone: "backlog",
    title: "Twilight 2000 CYOA",
    type: "summary",
    content: "Next conversion target. Waiting on Cyberpunk RED first.",
    tags: ["#cyoa", "#creative"],
    date: "Jan 15",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b6",
    slug: "vibecode-skills",
    zone: "backlog",
    title: "Vibecode Skills",
    type: "checklist",
    content: "",
    checklist: [
      { text: "HTML/CSS/JS basics", done: true },
      { text: "Cursor + GitHub pipeline", done: true },
      { text: "First test deploy", done: false },
      { text: "First real landing page", done: false },
    ],
    tags: ["#vibecode", "#learning"],
    date: "Feb 9",
    chatLink: null,
  },
  {
    id: "b7",
    slug: "council-of-ais",
    zone: "backlog",
    title: "Council of AIs Method",
    type: "summary",
    content: "Multi-AI approach for complex analysis. Document methodology.",
    tags: ["#ai", "#learning"],
    date: "Jan 20",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b8",
    slug: "hotico-translations",
    zone: "backlog",
    title: "HOTICO Translations",
    type: "summary",
    content: "JSON i18n — EN keys + {ro, en, fr} values. Ongoing.",
    tags: ["#alexandra", "#business"],
    date: "Feb 1",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b9",
    slug: "custom-landing-pages",
    zone: "backlog",
    title: "Custom Landing Pages",
    type: "summary",
    content: "Per-company pitch pages for Swiss targets. Template system.",
    tags: ["#jobhunt", "#vibecode", "#career"],
    date: "Feb 10",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b10",
    slug: "claude-skills",
    zone: "backlog",
    title: "Claude Skills System",
    type: "summary",
    content:
      "Custom skills: CYOA engine, writing style, brand methodology. Expand.",
    tags: ["#ai", "#creative"],
    date: "Feb 6",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b11",
    slug: "walking-dead-cyoa",
    zone: "backlog",
    title: "Walking Dead CYOA",
    type: "summary",
    content: "Adaptation from One Ring prompt. Context limit — restart needed.",
    tags: ["#cyoa", "#creative"],
    date: "Jan 12",
    chatLink: null,
    checklist: [],
  },
  {
    id: "b12",
    slug: "notebooklm-workflows",
    zone: "backlog",
    title: "NotebookLM Workflows",
    type: "summary",
    content: "Refined extraction pipeline for TTRPG source material.",
    tags: ["#ai", "#cyoa"],
    date: "Jan 25",
    chatLink: null,
    checklist: [],
  },
];

function generateId(): string {
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// Sheds exactly ONE pair of surrounding matching quotes (double or single) from a
// value. Quotes inside a value are left alone — only a matching outer pair goes.
// This is what stops `slug: "auditlens-app"` from becoming a distinct card whose
// slug literally contains quote characters.
function stripQuotes(value: string): string {
  const v = value.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return v.slice(1, -1).trim();
    }
  }
  return v;
}

function parseChecklist(raw: string): ChecklistItem[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(",").map((s) => {
    const text = stripQuotes(s.replace(/\s*[✓✔]\s*$|\s*\[x\]\s*$/i, "").trim());
    const done = /[✓✔]|\s*\[x\]\s*$/i.test(s.trim());
    return { text: text || stripQuotes(s.trim()), done };
  });
}

type ParsedCard = Partial<Card> & { slug: string; title: string };

function parseSnippet(
  text: string
): { card: ParsedCard; action: "new" | "update"; error?: string } {
  if (!text.includes("DASHBOARD_CARD:")) {
    return { card: {} as ParsedCard, action: "new", error: "Missing DASHBOARD_CARD: header" };
  }
  const actionMatch = text.match(/action:\s*(new|update)/i);
  const slugMatch = text.match(/slug:[^\S\n]*(.*?)(?:\n|$)/);
  const titleMatch = text.match(/title:[^\S\n]*(.*?)(?:\n|$)/);
  const typeMatch = text.match(/type:[^\S\n]*(.+?)(?:\n|$)/i);
  const zoneMatch = text.match(/zone:[^\S\n]*(.+?)(?:\n|$)/i);
  const tagsMatch = text.match(/tags:[^\S\n]*(.*?)(?:\n|$)/);
  const summaryMatch = text.match(/summary:[^\S\n]*([\s\S]*?)(?=\n\w+:|$)/);
  const checklistMatch = text.match(/checklist:[^\S\n]*([\s\S]*?)(?=\n\w+:|$)/);
  const linkMatch = text.match(/link:[^\S\n]*(.*?)(?:\n|$)/);

  if (!slugMatch || !titleMatch) {
    return { card: {} as ParsedCard, action: "new", error: "slug and title are required" };
  }

  const slug = stripQuotes(slugMatch[1]);
  const title = stripQuotes(titleMatch[1]);
  // A present-but-empty `slug:` / `title:` line is a malformed snippet, not a card.
  // The parser refuses it here rather than handing an empty-slugged card onward.
  if (!slug || !title) {
    return { card: {} as ParsedCard, action: "new", error: "slug and title are required" };
  }
  // Absence-aware contract: a field whose line is missing from the snippet parses
  // as `undefined` ("keep whatever the card already has"). Defaults live only in
  // the new-card branch of handleAddCard. A field that IS present always wins,
  // including an empty value (that is how you deliberately clear something).
  const typeValue = typeMatch ? stripQuotes(typeMatch[1]).toLowerCase() : undefined;
  const type =
    typeValue === "summary" || typeValue === "checklist" ? typeValue : undefined;
  const zoneValue = zoneMatch ? stripQuotes(zoneMatch[1]).toLowerCase() : undefined;
  const zone =
    zoneValue === "spotlight" || zoneValue === "backlog" ? zoneValue : undefined;
  const tagsRaw = tagsMatch ? stripQuotes(tagsMatch[1]) : undefined;
  const tags =
    tagsRaw === undefined
      ? undefined
      : tagsRaw
      ? tagsRaw.split(",").map((t) => stripQuotes(t)).filter(Boolean)
      : [];
  const content = summaryMatch ? stripQuotes(summaryMatch[1]) : undefined;
  const checklist = checklistMatch ? parseChecklist(stripQuotes(checklistMatch[1])) : undefined;
  const linkRaw = linkMatch ? stripQuotes(linkMatch[1]) : undefined;
  const chatLink = linkMatch
    ? linkRaw
      ? linkRaw.startsWith("http")
        ? linkRaw
        : "https://" + linkRaw
      : null
    : undefined;

  const card: ParsedCard = {
    slug,
    title,
    type,
    zone,
    tags,
    content,
    checklist,
    chatLink,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
  const action: "new" | "update" = actionMatch?.[1]?.toLowerCase() === "update" ? "update" : "new";
  return { card, action };
}

// --- Drag placement ------------------------------------------------------
// The grid renders the tag-FILTERED list, so the insertion line is drawn at
// filtered indices. Both helpers below resolve a drop through a reference CARD
// found by id rather than through an index, which is what keeps the line and the
// landing in agreement under a filter. And because the dragged card is removed
// from the array before the insert, the classic forward-drag off-by-one is not
// merely corrected — it is structurally impossible.
function insertByReference(
  withoutActive: Card[],
  card: Card,
  refCard: Card | null,
  lastCard: Card | null
): Card[] {
  const next = [...withoutActive];
  if (refCard) {
    const at = next.findIndex((c) => c.id === refCard.id);
    if (at !== -1) {
      next.splice(at, 0, card);
      return next;
    }
  }
  if (lastCard) {
    const at = next.findIndex((c) => c.id === lastCard.id);
    if (at !== -1) {
      next.splice(at + 1, 0, card);
      return next;
    }
  }
  let lastOfZone = -1;
  next.forEach((c, i) => {
    if (c.zone === card.zone) lastOfZone = i;
  });
  next.splice(lastOfZone === -1 ? next.length : lastOfZone + 1, 0, card);
  return next;
}

// Zone-level empty droppables. AM-1: both zones need one, symmetrically — an
// emptied Spotlight was previously unreachable by drag because there was no card
// to hover and no droppable to receive the pointer.
const ZONE_DROPPABLES: Record<string, "spotlight" | "backlog"> = {
  "spotlight-empty": "spotlight",
  "backlog-empty": "backlog",
};

type Toast = { id: string; message: string };

export default function DashboardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [snippet, setSnippet] = useState("");
  const [preview, setPreview] = useState<(ParsedCard & { action?: "new" | "update" }) | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [displayType, setDisplayType] = useState<Record<string, "summary" | "checklist">>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // The user's last DELIBERATE desktop choice. Crossing the mobile boundary and
  // back restores this instead of re-imposing the default.
  const desktopSidebarPref = useRef(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Snapshot of `cards` taken at dragStart. Three jobs: restore on cancel,
  // restore on a null drop (AM-2), and decide whether a zone ACTUALLY changed for
  // the toast (R-2) — never by counting dragOver events.
  const dragSnapshot = useRef<Card[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // The sortable wrapper already advertises role="button" / tabIndex=0 /
    // aria-roledescription="sortable". Until now nothing backed that claim.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addToast = useCallback((message: string) => {
    const id = generateId();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const loadCards = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Card[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(parsed);
          return;
        }
      }
    } catch (_) {}
    setCards(SEED);
  }, []);

  useEffect(() => {
    loadCards();
    // Initialize sidebar state and screen size detection
    // Only impose a sidebar state on first mount and when the mobile/desktop
    // boundary is actually crossed. Resizing within desktop must never reopen a
    // sidebar the user deliberately closed.
    let prevMobile: boolean | null = null;
    const checkScreenSize = () => {
      if (typeof window !== "undefined") {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (prevMobile === null || prevMobile !== mobile) {
          // Mobile is always closed. Desktop restores what the user last chose —
          // on first mount that is the default (open); afterwards it is theirs.
          setSidebarOpen(mobile ? false : desktopSidebarPref.current);
        }
        prevMobile = mobile;
      }
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [loadCards]);

  const saveCards = useCallback((next: Card[]) => {
    setCards(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const filteredCards = filterTag
    ? cards.filter((c) => c.tags.includes(filterTag))
    : cards;
  const spotlight = filteredCards.filter((c) => c.zone === "spotlight");
  const backlog = filteredCards.filter((c) => c.zone === "backlog");

  const tagCounts = cards.reduce<Record<string, number>>((acc, c) => {
    c.tags.forEach((t) => (acc[t] = (acc[t] || 0) + 1));
    return acc;
  }, {});
  const allTags = Object.keys(tagCounts).sort();

  const handleParse = () => {
    setParseError(null);
    setPreview(null);
    const { card, action, error } = parseSnippet(snippet);
    if (error) {
      setParseError(error);
      return;
    }
    if (!card.slug || !card.title) {
      setParseError("slug and title are required");
      return;
    }
    setPreview({ ...card, action });
  };

  const handleAddCard = () => {
    if (!preview?.slug || !preview?.title) return;
    const existing = cards.find((c) => c.slug === preview.slug);
    const declaredAction = preview.action ?? (existing ? "update" : "new");
    // Slug uniqueness guard: an existing slug always routes to the update path,
    // even when the snippet declares `action: new`. Two cards never share a slug.
    const action: "new" | "update" = existing ? "update" : "new";
    const slugCollision = Boolean(existing) && declaredAction === "new";

    if (action === "update" && existing) {
      const updated: Card = {
        ...existing,
        title: preview.title ?? existing.title,
        type: (preview.type as Card["type"]) ?? existing.type,
        zone: (preview.zone as Card["zone"]) ?? existing.zone,
        content: preview.content ?? existing.content,
        checklist: preview.checklist !== undefined ? preview.checklist : existing.checklist,
        chatLink: preview.chatLink !== undefined ? preview.chatLink : existing.chatLink,
        tags: preview.tags !== undefined ? preview.tags : existing.tags,
        date: preview.date ?? existing.date,
      };
      saveCards(cards.map((c) => (c.id === existing.id ? updated : c)));
      addToast(slugCollision ? "Slug exists — card updated" : "Card updated");
    } else {
      const newCard: Card = {
        id: generateId(),
        slug: preview.slug,
        title: preview.title,
        type: (preview.type as Card["type"]) || "summary",
        zone: (preview.zone as Card["zone"]) || "backlog",
        content: preview.content ?? "",
        checklist: Array.isArray(preview.checklist) ? preview.checklist : [],
        chatLink: preview.chatLink ?? null,
        tags: Array.isArray(preview.tags) ? preview.tags : [],
        date: preview.date ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
      saveCards([...cards, newCard]);
      addToast("Card added");
    }
    setPreview(null);
    setSnippet("");
  };

  const handleExport = () => {
    if (typeof window === "undefined") return;
    const json = JSON.stringify(cards, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");
    const a = document.createElement("a");
    a.href = url;
    a.download = "acp-dashboard-backup-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Backup exported");
  };

  const promote = (card: Card) => {
    saveCards(cards.map((c) => (c.id === card.id ? { ...c, zone: "spotlight" as const } : c)));
    addToast("Promoted to spotlight");
  };

  const demote = (card: Card) => {
    saveCards(cards.map((c) => (c.id === card.id ? { ...c, zone: "backlog" as const } : c)));
    addToast("Moved to backlog");
  };

  const remove = (card: Card) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete '" + card.title + "'? This cannot be undone.")
    ) {
      return;
    }
    saveCards(cards.filter((c) => c.id !== card.id));
    addToast("Card deleted");
  };

  const toggleCheck = (card: Card, index: number) => {
    saveCards(
      cards.map((c) => {
        if (c.id !== card.id || !c.checklist.length) return c;
        const next = [...c.checklist];
        next[index] = { ...next[index], done: !next[index].done };
        return { ...c, checklist: next };
      })
    );
  };

  const setCardDisplayType = (cardId: string, type: "summary" | "checklist") => {
    setDisplayType((d) => ({ ...d, [cardId]: type }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    dragSnapshot.current = cards;
    setActiveId(event.active.id as string);
  };

  const handleDragCancel = () => {
    const snapshot = dragSnapshot.current;
    dragSnapshot.current = null;
    setActiveId(null);
    if (snapshot) setCards(snapshot);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // Over an empty zone's droppable. Deliberately NO optimistic move here.
    // That droppable exists only while the zone is empty, so moving the card in
    // would unmount the very target the pointer is over, reflow the board, flip
    // the collision result to a card in the other zone, and reverse the move —
    // an infinite update loop (React #185). And nothing is lost: an empty zone
    // has exactly one landing position, so a placeholder communicates nothing
    // that the highlighted empty box doesn't already say. The zone is assigned
    // at commit instead.
    if (ZONE_DROPPABLES[over.id as string]) return;

    const overCard = cards.find((c) => c.id === over.id);
    if (!overCard || overCard.id === activeCard.id) return;

    // Same zone: rectSortingStrategy already draws the grey box. Nothing to do —
    // and doing nothing is what keeps this handler off the render path.
    if (overCard.zone === activeCard.zone) return;

    // Zone change: move the card into the target zone NOW, so it is rendered by
    // that zone's grid, at that zone's size, by that zone's component — which is
    // what makes dnd-kit draw a correctly sized placeholder for it. setCards only;
    // persistence happens exactly once, at commit.
    const withoutActive = cards.filter((c) => c.id !== active.id);
    const at = withoutActive.findIndex((c) => c.id === overCard.id);
    const next = [...withoutActive];
    next.splice(at === -1 ? next.length : at, 0, { ...activeCard, zone: overCard.zone });
    setCards(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const snapshot = dragSnapshot.current;
    dragSnapshot.current = null;
    setActiveId(null);

    // AM-2: released outside every droppable. Nothing happened — restore the
    // snapshot and persist nothing. F-2: this is the ONLY restoring case. A
    // release over the card's own placeholder must still commit, because an
    // optimistic zone change may already be on screen.
    if (!over) {
      if (snapshot) setCards(snapshot);
      return;
    }

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // R-1: over.id may be an empty-zone droppable, not a card. No reference
    // resolution is possible there — findIndex would return -1 and corrupt the
    // order — and none is needed: an empty zone has one slot.
    const emptyZone = ZONE_DROPPABLES[over.id as string];
    const isCardTarget =
      !emptyZone && over.id !== active.id && cards.some((c) => c.id === over.id);

    let committed = cards;
    // The zone this card will actually end up in. Drops onto an empty zone are
    // assigned here rather than during the drag, so activeCard.zone is stale for
    // that path — R-2's comparison must use this, not activeCard.zone.
    let finalZone = activeCard.zone;

    if (emptyZone) {
      finalZone = emptyZone;
      if (activeCard.zone !== emptyZone) {
        committed = cards.map((c) =>
          c.id === active.id ? { ...c, zone: emptyZone } : c
        );
      }
    } else if (isCardTarget) {
      // After the optimistic move, every drop is a same-zone reorder.
      const visibleZone = filteredCards.filter((c) => c.zone === activeCard.zone);
      const overIndex = visibleZone.findIndex((c) => c.id === over.id);
      const activeIndex = visibleZone.findIndex((c) => c.id === active.id);
      // dnd-kit placeholder semantics: dragging forward lands AFTER the hovered
      // card, backward lands BEFORE it. Resolved by reference, never by index.
      const refCard =
        activeIndex !== -1 && activeIndex < overIndex
          ? visibleZone[overIndex + 1] ?? null
          : visibleZone[overIndex] ?? null;
      const others = visibleZone.filter((c) => c.id !== active.id);
      const lastCard = others.length ? others[others.length - 1] : null;
      committed = insertByReference(
        cards.filter((c) => c.id !== active.id),
        activeCard,
        refCard,
        lastCard
      );
    }

    saveCards(committed);

    // R-2: a zone change is decided by comparing the snapshot to the commit,
    // never by counting dragOver events. Crossing into a zone and back again is
    // a same-zone drag: zero toasts.
    const zoneBefore = snapshot?.find((c) => c.id === active.id)?.zone;
    if (zoneBefore && zoneBefore !== finalZone) {
      addToast(
        finalZone === "spotlight" ? "Promoted to spotlight" : "Moved to backlog"
      );
    }
  };

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  // The preview must describe the card as it will exist AFTER the click: a parsed
  // value wins, an absent field on an existing slug shows what will be kept, and an
  // absent field on a new slug shows the default handleAddCard will apply.
  const previewTarget = preview?.slug
    ? cards.find((c) => c.slug === preview.slug)
    : undefined;
  const previewField = (
    parsed: string | undefined,
    existingValue: string | undefined,
    fallback: string
  ) => {
    if (parsed !== undefined) return parsed;
    if (previewTarget && existingValue !== undefined) return existingValue + " (kept)";
    return fallback;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // AM-5: droppables that mount mid-drag — the empty-zone targets, which
      // appear the instant the last card leaves a zone — are never measured under
      // the default strategy, so the pointer would never register as over them.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-[999] bg-[rgba(4,5,26,0.45)] transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="flex h-full flex-col border-r"
        style={{
          borderColor: sidebarOpen ? "var(--border)" : "transparent",
          borderRightWidth: sidebarOpen ? "1px" : "0",
          // Mobile: fixed overlay drawer
          ...(isMobile && {
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1000,
            background: "var(--bg)",
            width: "280px",
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            overflow: "hidden",
          }),
          // Desktop: relative, in flex flow, width transition
          ...(!isMobile && {
            position: "relative",
            width: sidebarOpen ? "220px" : "0",
            minWidth: sidebarOpen ? "220px" : "0",
            maxWidth: sidebarOpen ? "220px" : "0",
            background: "var(--sidebar)",
            transition: [
              "width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              "min-width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              "max-width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            ].join(", "),
            overflow: "hidden",
            flexShrink: 0,
            pointerEvents: sidebarOpen ? "auto" : "none",
          }),
        }}
      >
        {/* Content wrapper with fade timing */}
        <div
          className="flex h-full flex-col py-4 pl-3 pr-2"
          style={{
            opacity: sidebarOpen ? 1 : 0,
            transition: sidebarOpen
              ? "opacity 0.2s ease 0.2s"
              : "opacity 0.2s ease",
            pointerEvents: sidebarOpen ? "auto" : "none",
          }}
        >
          {/* Close button for mobile */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="mb-2 flex h-8 w-8 flex-shrink-0 items-center justify-center self-end rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] transition-colors hover:opacity-80 md:hidden"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          {/* Brand lockup — colour mark on the ivory ground. */}
          <div className="mb-5 flex items-center gap-[11px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pop-logo-color.png" alt="ACP" className="h-[34px] w-auto" />
            <div className="leading-[1.1]">
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Command
              </div>
              <div className="font-playfair text-[0.92rem] font-extrabold text-[var(--text-primary)]">
                Dashboard
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            className="font-mono mb-2 flex items-center justify-center gap-[0.55em] rounded-[100px] bg-[var(--accent)] px-4 py-[0.85em] text-[0.72rem] font-medium uppercase tracking-[0.1em] text-[var(--ivory)] transition-transform duration-150 hover:-translate-y-[2px]"
          >
            Import card <span aria-hidden="true">＋</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="font-mono mb-5 flex items-center justify-center gap-[0.55em] rounded-[100px] border border-[var(--line-strong)] px-4 py-[0.85em] text-[0.72rem] font-medium uppercase tracking-[0.1em] text-[var(--text-primary)] transition-transform duration-150 hover:-translate-y-[2px]"
          >
            Export JSON <span aria-hidden="true">↓</span>
          </button>
          <div className="font-mono mb-2 flex items-center gap-[0.5em] text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]"
            />
            Threads
          </div>
          <button
            type="button"
            onClick={() => setFilterTag(null)}
            className="font-mono mb-1 flex items-center gap-[0.6em] rounded-[8px] px-[0.6em] py-[0.5em] text-left text-[0.74rem] tracking-[0.02em] transition-colors"
            style={{
              background: filterTag === null ? "var(--card-hover)" : "transparent",
              color: filterTag === null ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            All items
            <span className="ml-auto opacity-60">{cards.length}</span>
          </button>
          <div className="my-1 h-px bg-[var(--line)]" />
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setFilterTag(tag)}
                className="font-mono flex items-center gap-[0.6em] rounded-[8px] py-[0.5em] pr-[0.6em] text-left text-[0.74rem] tracking-[0.02em] transition-colors"
                style={{
                  background: filterTag === tag ? getTagBg(tag) : "transparent",
                  // RA-3: navy label at every tag site. The thread colour lives
                  // on the swatch and the active edge, never on the text.
                  color: filterTag === tag ? "var(--text-primary)" : "var(--text-secondary)",
                  borderLeft: filterTag === tag ? `3px solid ${getTagColor(tag)}` : "3px solid transparent",
                  marginLeft: -3,
                  paddingLeft: "calc(0.6em + 3px)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: getTagColor(tag),
                    flex: "none",
                  }}
                />
                {tag}
                <span className="ml-auto opacity-[0.55]">{tagCounts[tag]}</span>
              </button>
            ))}
          </div>
          <div className="font-mono mt-auto pt-4 text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] opacity-70">
            v{pkg.version} · ivory loom
          </div>
        </div>
      </aside>

      {/* Main */}
      <main
        className="flex min-w-0 flex-1 flex-col overflow-auto p-6"
        style={{
          width: "100%",
          ...(!isMobile && {
            transition: "width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }),
        }}
      >
        <header className="mb-7">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !sidebarOpen;
                setSidebarOpen(next);
                if (!isMobile) desktopSidebarPref.current = next;
              }}
              className="relative mt-[6px] flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-[var(--line-strong)] bg-[var(--card-bg)] text-[var(--text-primary)] transition-colors hover:opacity-80 md:h-[38px] md:w-[38px]"
              aria-label="Toggle sidebar"
            >
              <span
                className="flex h-5 w-5 items-center justify-center md:h-[18px] md:w-[18px]"
                style={{
                  transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                {sidebarOpen ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-mono mb-2 flex items-center gap-[0.55em] text-[0.66rem] uppercase tracking-[0.18em] text-[var(--accent)]">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]"
                />
                Personal command center
              </div>
              <h1 className="font-playfair text-3xl font-extrabold leading-none text-[var(--text-primary)]">
                ACP&apos;s CLAUDE DASHBOARD
              </h1>
              <p className="font-voice mt-[10px] text-[1.02rem] leading-[1.4] text-[var(--text-secondary)]">
                Spotlight: {spotlight.length} · Backlog: {backlog.length}
                {filterTag && (
                  <span className="inline-flex items-center gap-1.5">
                    {" · filtering "}
                    <TagPill tag={filterTag} compact />
                  </span>
                )}
              </p>
            </div>
          </div>
        </header>

        {/* Import Panel */}
        {importOpen && (
          <section
            className="mb-7 border border-[var(--border)] bg-[var(--card-bg)] px-[22px] py-5"
            style={{ borderRadius: "0 18px 18px 0", borderLeft: "3px solid var(--accent)" }}
          >
            <h2 className="font-mono mb-3 text-[0.66rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              Import card
            </h2>
            <textarea
              value={snippet}
              onChange={(e) => {
                // The preview describes one exact snippet. The instant the text
                // changes, that description is stale and the button below it would
                // be promising an action for text that no longer exists — so the
                // preview follows the textarea, always.
                setSnippet(e.target.value);
                setPreview(null);
                setParseError(null);
              }}
              placeholder="Paste DASHBOARD_CARD: snippet..."
              className="font-mono mb-3 min-h-[140px] w-full resize-y rounded-[10px] border border-[var(--line)] px-[14px] py-3 text-[0.82rem] leading-[1.6] text-[var(--text-primary)]"
              style={{ background: "color-mix(in srgb, var(--text-primary) 4%, transparent)" }}
              rows={6}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleParse}
                className="font-mono rounded-[100px] bg-[var(--navy)] px-6 py-[0.8em] text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[var(--ivory)] transition-transform duration-150 hover:-translate-y-[2px]"
              >
                Parse snippet
              </button>
              {parseError && (
                <span className="font-mono text-[0.72rem] text-[var(--danger)]">
                  {parseError}
                </span>
              )}
            </div>
            {preview && preview.slug && (
              <div className="mt-4 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 py-[14px]">
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Preview
                </div>
                <div className="font-playfair mb-[3px] mt-[5px] text-[1.05rem] font-bold text-[var(--text-primary)]">
                  {preview.title}
                </div>
                <div className="font-mono flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.72rem] tracking-[0.03em] text-[var(--text-secondary)]">
                  <span>{previewField(preview.zone, previewTarget?.zone, "backlog")}</span>
                  <span aria-hidden="true">·</span>
                  <span>{previewField(preview.type, previewTarget?.type, "summary")}</span>
                  <span aria-hidden="true">·</span>
                  {renderPreviewTags(
                    previewField(
                      preview.tags === undefined
                        ? undefined
                        : preview.tags.length
                        ? preview.tags.join(", ")
                        : "no tags",
                      previewTarget && previewTarget.tags.length
                        ? previewTarget.tags.join(", ")
                        : "no tags",
                      "no tags"
                    )
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddCard}
                    className="font-mono rounded-[100px] bg-[var(--accent)] px-[1.4em] py-[0.72em] text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[var(--ivory)] transition-transform duration-150 hover:-translate-y-[2px]"
                  >
                    {cards.some((c) => c.slug === preview.slug) ? "Update card" : "Add card"}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SPOTLIGHT */}
        <section className="mb-8 relative">
          <h2 className="mb-4 flex items-center gap-[0.7em]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/motifs/north-star.svg" alt="" className="h-6 w-6 flex-none" />
            <span className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--text-primary)]">
              Spotlight
            </span>
            <span className="font-mono text-[0.66rem] tracking-[0.08em] text-[var(--text-secondary)]">
              {spotlight.length}
            </span>
            <span className="h-px flex-1 bg-[var(--line)]" />
          </h2>
          <SortableContext
            items={spotlight.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className="spotlight-grid relative grid items-stretch gap-[18px]"
              style={{
                gridTemplateColumns: sidebarOpen
                  ? "repeat(auto-fill, minmax(280px, 1fr))"
                  : "repeat(auto-fill, minmax(300px, 1fr))",
              }}
            >
              {spotlight.length === 0 ? (
                <ZoneEmptyDropTarget
                  id="spotlight-empty"
                  label="No cards in spotlight — drag one up from the backlog"
                />
              ) : (
                spotlight.map((card) => (
                  <SortableSpotlightCard
                    key={card.id}
                    card={card}
                    displayType={displayType[card.id] ?? card.type}
                    onDisplayTypeChange={(t) => setCardDisplayType(card.id, t)}
                    onDemote={() => demote(card)}
                    onDelete={() => remove(card)}
                    onToggleCheck={(i) => toggleCheck(card, i)}
                    getTagColor={getTagColor}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </section>

        {/* BACKLOG */}
        <section className="relative">
          <h2 className="mb-4 flex items-center gap-[0.7em]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/motifs/diamond-eye.svg" alt="" className="h-6 w-6 flex-none" />
            <span className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--text-primary)]">
              Backlog
            </span>
            <span className="font-mono text-[0.66rem] tracking-[0.08em] text-[var(--text-secondary)]">
              {backlog.length}
            </span>
            <span className="h-px flex-1 bg-[var(--line)]" />
          </h2>
          <SortableContext
            items={backlog.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className="backlog-grid relative grid gap-[14px]"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
              }}
            >
              {backlog.length === 0 ? (
                <ZoneEmptyDropTarget
                  id="backlog-empty"
                  label="No cards in backlog — import one to get started"
                />
              ) : (
                backlog.map((card) => (
                  <SortableBacklogCard
                    key={card.id}
                    card={card}
                    onClick={() => promote(card)}
                    onDelete={() => remove(card)}
                    getTagColor={getTagColor}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </section>
      </main>

      {/* Toasts */}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="font-mono rounded-[10px] border px-4 py-[10px] text-[0.72rem] tracking-[0.04em]"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              borderLeft: "3px solid var(--accent)",
              color: "var(--text-primary)",
              boxShadow: "0 12px 30px -14px rgba(4,5,26,0.5)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard ? (
          <div
            className="drag-overlay-card"
            style={{
              transform: "scale(1.03)",
              opacity: 0.85,
              boxShadow:
                "0 22px 50px -20px rgba(4,5,26,0.55), 0 8px 20px -12px rgba(4,5,26,0.35)",
              borderRadius: activeCard.zone === "spotlight" ? "0 18px 18px 0" : "18px",
              background: "var(--card-bg)",
              border: "2px solid var(--accent)",
              padding: activeCard.zone === "spotlight" ? "16px" : "12px",
              width: activeCard.zone === "spotlight" ? 300 : 195,
              minHeight: activeCard.zone === "spotlight" ? 120 : 80,
              maxHeight: activeCard.zone === "spotlight" ? 320 : 220,
              cursor: "grabbing",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          >
            <div
              className="font-playfair"
              style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}
            >
              {activeCard.title}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {activeCard.tags.slice(0, 2).join(", ")}
            </div>
          </div>
        ) : null}
      </DragOverlay>
      </div>
    </DndContext>
  );
}

function ZoneEmptyDropTarget({
  id,
  label,
}: {
  id: "spotlight-empty" | "backlog-empty";
  label: string;
}) {
  // Highlight comes from dnd-kit's own `isOver` alone now — the insertionPosition
  // that used to feed it no longer exists.
  const { setNodeRef, isOver: showHighlight } = useDroppable({ id });
  // Motif picked from the id the component already receives — no new prop, so
  // every call site stays exactly as it was.
  const motif = id === "spotlight-empty" ? "stem-bloom" : "quad-knot";
  return (
    <div
      ref={setNodeRef}
      className="backlog-empty-state"
      style={{
        minHeight: "220px",
        border: "1.5px dashed var(--line-strong)",
        borderRadius: "18px",
        color: "var(--text-secondary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "40px 24px",
        textAlign: "center",
        background: showHighlight ? "var(--card-hover)" : "transparent",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/motifs/${motif}.svg`} alt="" width={40} height={40} />
      <span className="font-voice" style={{ fontSize: "1rem" }}>
        {label}
      </span>
    </div>
  );
}

function SortableSpotlightCard({
  card,
  displayType,
  onDisplayTypeChange,
  onDemote,
  onDelete,
  onToggleCheck,
  getTagColor,
}: {
  card: Card;
  displayType: "summary" | "checklist";
  onDisplayTypeChange: (t: "summary" | "checklist") => void;
  onDemote: () => void;
  onDelete: () => void;
  onToggleCheck: (index: number) => void;
  getTagColor: (tag: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 0.2s ease",
    opacity: 1,
    cursor: isDragging ? "grabbing" : "grab",
    position: "relative" as const,
    // AM-4: a drag that fights page scroll on a phone is a drop-truth failure.
    touchAction: "none" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-sortable-id={card.id}
    >
      {isDragging ? (
        <div
          style={{
            minHeight: 120,
            borderRadius: "0 18px 18px 0",
            border: "2px dashed var(--line-strong)",
            background: "var(--card-hover)",
          }}
        />
      ) : (
        <>
          <SpotlightCard
            card={card}
            displayType={displayType}
            onDisplayTypeChange={onDisplayTypeChange}
            onDemote={onDemote}
            onDelete={onDelete}
            onToggleCheck={onToggleCheck}
            getTagColor={getTagColor}
            isDragging={isDragging}
          />
        </>
      )}
    </div>
  );
}

function SortableBacklogCard({
  card,
  onClick,
  onDelete,
  getTagColor,
}: {
  card: Card;
  onClick: () => void;
  onDelete: () => void;
  getTagColor: (tag: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 0.2s ease",
    opacity: 1,
    cursor: isDragging ? "grabbing" : "grab",
    position: "relative" as const,
    // AM-4: a drag that fights page scroll on a phone is a drop-truth failure.
    touchAction: "none" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-sortable-id={card.id}
    >
      {isDragging ? (
        <div
          style={{
            minHeight: 80,
            borderRadius: "18px",
            border: "2px dashed var(--line-strong)",
            background: "var(--card-hover)",
          }}
        />
      ) : (
        <>
          <BacklogCard
            card={card}
            onClick={onClick}
            onDelete={onDelete}
            getTagColor={getTagColor}
            isDragging={isDragging}
          />
        </>
      )}
    </div>
  );
}

function SpotlightCard({
  card,
  displayType,
  onDisplayTypeChange,
  onDemote,
  onDelete,
  onToggleCheck,
  getTagColor,
  isDragging = false,
}: {
  card: Card;
  displayType: "summary" | "checklist";
  onDisplayTypeChange: (t: "summary" | "checklist") => void;
  onDemote: () => void;
  onDelete: () => void;
  onToggleCheck: (index: number) => void;
  getTagColor: (tag: string) => string;
  isDragging?: boolean;
}) {
  const canSwitch = card.type === "checklist" && (card.content?.length > 0 || card.checklist.length > 0);
  const orderedChecklist = card.checklist
    .map((item, index) => ({ item, index }))
    .reduce<{ item: ChecklistItem; index: number }[]>(
      (acc, entry) => {
        if (!entry.item.done) {
          acc.push(entry);
        }
        return acc;
      },
      []
    )
    .concat(
      card.checklist
        .map((item, index) => ({ item, index }))
        .filter((entry) => entry.item.done)
    );

  return (
    <div
      className="group relative flex max-h-[320px] cursor-grab flex-col border border-[var(--border)] bg-[var(--card-bg)] px-[18px] pb-4 pt-[18px] card-scrollable transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_14px_34px_-18px_rgba(4,5,26,0.5)]"
      style={{ borderRadius: "0 18px 18px 0", borderLeft: "3px solid var(--accent)" }}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 invisible pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:visible [@media(hover:none)]:pointer-events-auto">
        {canSwitch && (
          <span className="flex rounded-[6px] border border-[var(--line)]">
            <button
              type="button"
              onClick={() => onDisplayTypeChange("summary")}
              className="font-mono px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]"
              style={{
                background: displayType === "summary" ? "var(--card-hover)" : "transparent",
              }}
            >
              Paragraph
            </button>
            <button
              type="button"
              onClick={() => onDisplayTypeChange("checklist")}
              className="font-mono px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]"
              style={{
                background: displayType === "checklist" ? "var(--card-hover)" : "transparent",
              }}
            >
              Checklist
            </button>
          </span>
        )}
        <button
          type="button"
          onClick={onDemote}
          className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--card-bg)] text-[13px] leading-none text-[var(--text-secondary)] transition-colors hover:opacity-80"
          title="Demote to backlog"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--card-bg)] text-[13px] leading-none text-[var(--danger)] transition-colors hover:opacity-80"
          title="Delete"
        >
          ×
        </button>
      </div>
      <h3 className="font-playfair pr-20 text-[1.08rem] font-bold leading-[1.15] tracking-[-0.01em] flex-shrink-0 text-[var(--text-primary)]">
        {card.title}
      </h3>
      {/* RA-3 site 1 */}
      <div className="mt-2 flex flex-wrap items-center gap-[7px] flex-shrink-0">
        {card.tags.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>
      <div
        className="mt-2 text-sm flex-1 overflow-y-auto text-[var(--text-secondary)] card-content-scroll"
        style={{
          scrollBehavior: "smooth",
          maskImage: "linear-gradient(to bottom, black calc(100% - 20px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 20px), transparent 100%)",
        }}
      >
        {displayType === "checklist" && card.checklist.length > 0 ? (
          <ul className="list-none space-y-1">
            {orderedChecklist.map(({ item, index }) => (
              <li key={index} className="flex items-center gap-2">
                {isUrl(item.text) ? (
                  <a
                    href={item.text.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--peri)] no-underline hover:underline"
                  >
                    {item.text.trim().length > 40
                      ? `${item.text.trim().slice(0, 37)}...`
                      : item.text.trim()}
                  </a>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onToggleCheck(index)}
                      className="rounded"
                      style={{ accentColor: "var(--success)" }}
                    />
                    <span
                      style={{
                        textDecoration: item.done ? "line-through" : "none",
                        opacity: item.done ? 0.8 : 1,
                      }}
                    >
                      {item.text}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-voice whitespace-pre-wrap text-[0.98rem] leading-[1.5]">
            {renderTextWithLinks(card.content || "—", 40)}
          </p>
        )}
        {card.chatLink && (
          <a
            href={card.chatLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono mt-2 inline-block text-[0.62rem] tracking-[0.05em] text-[var(--peri)]"
          >
            Open chat →
          </a>
        )}
        <div className="font-mono mt-3 text-[0.6rem] tracking-[0.08em] text-[var(--text-secondary)] opacity-75">
          {card.date}
        </div>
      </div>
    </div>
  );
}

function BacklogCard({
  card,
  onClick,
  onDelete,
  getTagColor,
  isDragging = false,
}: {
  card: Card;
  onClick: () => void;
  onDelete: () => void;
  getTagColor: (tag: string) => string;
  isDragging?: boolean;
}) {
  const orderedChecklistForPreview =
    card.type === "checklist"
      ? [
          ...card.checklist.filter((item) => !item.done),
          ...card.checklist.filter((item) => item.done),
        ]
      : card.checklist;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isDragging) onClick();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isDragging) {
          // Space scrolls the page by default; a card that activates on Space
          // must not also jump the viewport out from under you.
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex max-h-[220px] flex-col rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-[13px] card-scrollable card-backlog transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_10px_24px_-16px_rgba(4,5,26,0.45)]"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-2 z-10 flex h-[21px] w-[21px] items-center justify-center rounded-[5px] border border-[var(--line)] bg-[var(--card-bg)] text-[12px] leading-none text-[var(--danger)] opacity-0 invisible pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:visible [@media(hover:none)]:pointer-events-auto"
        title="Delete"
      >
        ×
      </button>
      <h3 className="font-playfair pr-6 text-[0.9rem] font-bold leading-[1.18] tracking-[-0.01em] flex-shrink-0 text-[var(--text-primary)]">
        {card.title}
      </h3>
      {/* RA-3 site 2 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 flex-shrink-0">
        {card.tags.slice(0, 3).map((tag) => (
          <TagPill key={tag} tag={tag} compact />
        ))}
      </div>
      <div
        className="mt-1 text-xs flex-1 overflow-y-auto text-[var(--text-secondary)] card-content-scroll"
        style={{
          scrollBehavior: "smooth",
          maskImage: "linear-gradient(to bottom, black calc(100% - 15px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 15px), transparent 100%)",
        }}
      >
        <p className="text-[0.78rem] leading-[1.45] text-[var(--text-secondary)]">
          {renderTextWithLinks(
            card.type === "checklist"
              ? orderedChecklistForPreview.map((i) => i.text).join(" · ")
              : card.content || "—",
            30
          )}
        </p>
        <div className="font-mono mt-2 text-[0.56rem] tracking-[0.06em] text-[var(--text-secondary)] opacity-70">
          {card.date}
        </div>
      </div>
    </div>
  );
}
