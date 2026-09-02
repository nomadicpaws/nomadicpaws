import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  addReviewNote,
  askCheetoAssistant,
  API_URL,
  AppUser,
  AppleSignInPayload,
  approveTeamAccess,
  claimKatieAccount,
  CheetoSuggestion,
  createEventSale,
  completeMomReview,
  createJournalStory,
  createSharedAdventure,
  createTerminalConnectionToken,
  EventProduct,
  JournalContribution,
  JournalReviewNote,
  JournalStory,
  JournalStoryDetail,
  JournalWorkingDraft,
  JournalWorkingVersion,
  loadInstagramStudio,
  loadEventProducts,
  loadEventSaleStatus,
  loadJournalContributions,
  loadPinterestCampaigns,
  loadSharedMedia,
  loadStories,
  loadStory,
  loadTeamAccess,
  loadVideoProjects,
  privateMediaUrl,
  publishJournalWorkingDraft,
  requestMomReview,
  PinterestCampaign,
  publicWorkingImagePath,
  restoreAppSession,
  saveInstagramPost,
  saveInstagramRhythm,
  saveJournalContribution,
  saveJournalWorkingDraft,
  savePinterestCampaign,
  saveWorkingVersion,
  saveVideoProject,
  SharedAdventure,
  SharedMediaAsset,
  signInWithApple,
  signOutApp,
  updateReviewNote,
  updateSharedMedia,
  uploadAdventurePhoto,
  uploadAdventureVideo,
  uploadInstagramTemplate,
  workingImageUrl,
  WorkingVersion,
  VideoOverlayDraft,
  VideoProject,
} from "./src/api";
import {
  ContentSeed,
  initialInstagramRhythm,
  initialSchedule,
  InstagramDay,
  InstagramPostDraft,
  InstagramTemplate,
  Person,
  SharedPreview,
  starterInstagramTemplates,
  starterSeeds,
  videoOverlayPresets,
} from "./src/content";
import * as ImagePicker from "expo-image-picker";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as ExpoMediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  listenForRenderProgress,
  renderNomadicVideo,
} from "./modules/nomadic-video-renderer";
import {
  Reader,
  StripeTerminalProvider,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";

type Tab =
  | "Today"
  | "Media"
  | "Studio"
  | "Video"
  | "Journal"
  | "Pinterest";
type LogoColor = "none" | "bark" | "sage" | "sand" | "terracotta";
type LogoSize = "small" | "medium";
type LogoSide = "left" | "right";
type JournalTab = "Write" | "Photos" | "Social" | "Publish";
type JournalAdaptation = {
  platform: "Instagram" | "Pinterest" | "TikTok" | "YouTube Shorts";
  slug: string;
  title: string;
  description: string;
  publishDate: string;
};
type PhotoDestination =
  | "trail-hero"
  | "trail-article"
  | "pinterest"
  | "instagram";
type PinterestPinDraft = {
  asset?: SharedMediaAsset;
  finishedImage?: string;
  title: string;
  description: string;
  logo: Exclude<LogoColor, "none">;
  size: LogoSize;
  side: LogoSide;
  focus: "top" | "center" | "bottom";
};

type CalendarItem = {
  id: string;
  date: string;
  title: string;
  platform: "Trail Journal" | "Instagram" | "Pinterest";
  status: string;
  detail: string;
};

const colors = {
  cream: "#fdfaf5",
  sand: "#f4eee1",
  sandDeep: "#e9dfc8",
  bark: "#3f352a",
  barkSoft: "#6b5d4c",
  sage: "#8b9a7c",
  sageDeep: "#6f7e62",
  terracotta: "#c1734b",
  terracottaDeep: "#a85c39",
  white: "#ffffff",
};

const logoChoices: Array<{
  label: string;
  value: Exclude<LogoColor, "none">;
}> = [
  { label: "Bark", value: "bark" },
  { label: "Sage", value: "sage" },
  { label: "Sand", value: "sand" },
  { label: "Terracotta", value: "terracotta" },
];

const videoFonts = [
  { id: "clean", name: "Clean", family: "System", preview: "Easy to read" },
  {
    id: "editorial",
    name: "Trail Journal",
    family: "Fraunces",
    preview: "A desert story",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    family: "Special Elite",
    preview: "Field notes",
  },
  {
    id: "handwritten",
    name: "Handwritten",
    family: "Caveat",
    preview: "Cheeto said so",
  },
  {
    id: "tall",
    name: "Tall title",
    family: "Bebas Neue",
    preview: "TRAIL DAY",
  },
  { id: "bold", name: "Bold Cheeto", family: "Bungee", preview: "MANAGEMENT" },
  {
    id: "classic",
    name: "Classic story",
    family: "Playfair Display",
    preview: "Golden hour",
  },
  {
    id: "impact",
    name: "Big emphasis",
    family: "Archivo Black",
    preview: "WAIT FOR IT",
  },
];
const mediaTags = [
  "Cheeto",
  "Trail",
  "Wildlife",
  "Product",
  "Behind the Scenes",
];

const LOGIN_KEYBOARD_ACCESSORY = "nomadic-paws-login-keyboard";
const APP_SESSION_KEY = "nomadic-paws-private-session";
const TRINITIE_WELCOME_KEY = "nomadic-paws-trinitie-studio-welcome";
const INSTAGRAM_REMINDER_SETTING = "nomadic-paws-instagram-reminder";
const INSTAGRAM_REMINDER_ID = "nomadic-paws-instagram-reminder-id";
const INSTAGRAM_REMINDER_TIME = "nomadic-paws-instagram-reminder-time";

type LocalJournalDraft = {
  storySlug: string;
  serverRevision: number;
  savedAt: string;
  title: string;
  description: string;
  category: string;
  image: string;
  imageAlt: string;
  body: string;
  isDraft: boolean;
  publishDate: string;
};

type LocalInstagramDraft = {
  draftKey: string;
  savedAt: string;
  title: string;
  caption: string;
  mediaUrls: string[];
  targetDate: string;
  theme: string;
  handoffNote: string;
  sharedWithMom: boolean;
};

function localJournalDraftPath(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-");
  return `${FileSystem.documentDirectory || FileSystem.cacheDirectory}journal-${safeSlug}.json`;
}

function localInstagramDraftPath(key: string) {
  const safeKey = key.replace(/[^a-z0-9-]/gi, "-");
  return `${FileSystem.documentDirectory || FileSystem.cacheDirectory}instagram-${safeKey}.json`;
}

async function syncInstagramReminder(
  posts: InstagramPostDraft[],
  enabled: boolean,
  time = "17:30",
  rhythm: InstagramDay[] = initialInstagramRhythm,
) {
  const previous = await SecureStore.getItemAsync(INSTAGRAM_REMINDER_ID);
  if (previous) {
    await Notifications.cancelScheduledNotificationAsync(previous).catch(() => {});
    await SecureStore.deleteItemAsync(INSTAGRAM_REMINDER_ID);
  }
  if (!enabled) return;
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  const hour = match ? Number(match[1]) : 17;
  const minute = match ? Number(match[2]) : 30;
  const now = new Date();
  let target: Date | undefined;
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() <= now.getTime()) continue;
    const weekday = candidate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    if (rhythm.find((item) => item.day === weekday)?.enabled === false) continue;
    const alreadyPrepared = posts.some(
      (post) =>
        post.targetDate === localDateKey(candidate) &&
        ["Ready", "Handed Off", "Posted"].includes(post.status),
    );
    if (!alreadyPrepared) {
      target = candidate;
      break;
    }
  }
  if (!target) return;
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Today’s post is still available",
      body: "Continue, ask Katie for help, hand it over, or skip today—whatever fits.",
      data: { workspace: "instagram" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
    },
  });
  await SecureStore.setItemAsync(INSTAGRAM_REMINDER_ID, id);
}
const DEVICE_LOCK_KEY = "nomadic-paws-device-lock";

function localDateKey(date = new Date()) {
  const year = date.getFullYear(),
    month = String(date.getMonth() + 1).padStart(2, "0"),
    day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function journalPreviewSlug(title: string, publishDate: string) {
  const date = publishDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || new Date().toISOString().slice(0, 10);
  const words = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
  return `${date}-${words || "trail-journal-story"}`;
}

function exportStem(value: string, fallback = "nomadic-paws") {
  const safe = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
  return safe || fallback;
}

function reminderLabel(time: string) {
  const [rawHour, minute = "00"] = time.split(":"),
    hour = Number(rawHour || 17),
    suffix = hour >= 12 ? "PM" : "AM",
    displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function Choice<T extends string>({
  value,
  current,
  label,
  onPress,
}: {
  value: T;
  current: T;
  label: string;
  onPress: (value: T) => void;
}) {
  const selected = value === current;
  return (
    <Pressable
      onPress={() => onPress(value)}
      style={[styles.choice, selected && styles.choiceSelected]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

type SignedInAccount = { token: string; user: AppUser };

function Login({
  onSignedIn,
}: {
  onSignedIn: (account: SignedInAccount) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applePayload, setApplePayload] = useState<AppleSignInPayload | null>(
    null,
  );
  const [setupRequired, setSetupRequired] = useState(false);
  const [pending, setPending] = useState(false);
  async function appleSignIn() {
    setBusy(true);
    setError("");
    try {
      const rawNonce = Crypto.randomUUID();
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });
      if (!credential.identityToken)
        throw new Error(
          "Apple did not return the sign-in information the app needs.",
        );
      const name = [
        credential.fullName?.givenName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(" ");
      const payload = {
        identityToken: credential.identityToken,
        nonce,
        email: credential.email || undefined,
        name: name || undefined,
      };
      setApplePayload(payload);
      const result = await signInWithApple(payload);
      if (result.token && result.user.status === "active")
        return onSignedIn({ token: result.token, user: result.user });
      setSetupRequired(Boolean(result.setupRequired));
      setPending(Boolean(result.pending));
    } catch (reason) {
      if ((reason as { code?: string })?.code !== "ERR_REQUEST_CANCELED")
        setError(
          reason instanceof Error
            ? reason.message
            : "Apple sign-in did not finish.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function claimOwner() {
    if (!applePayload) return;
    setBusy(true);
    setError("");
    try {
      onSignedIn(
        await claimKatieAccount({ ...applePayload, accessCode: code }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Owner setup did not finish.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={styles.loginKeyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={styles.login}>
          <ScrollView
            contentContainerStyle={styles.loginContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={require("./assets/icon.png")}
              style={styles.loginLogo}
            />
            <Text style={styles.eyebrow}>PRIVATE NOMADIC PAWS WORKSPACE</Text>
            <Text style={styles.heroTitle}>
              {pending
                ? "You’re at the right door."
                : setupRequired
                  ? "One tiny setup step."
                  : "Ready when you are."}
            </Text>
            <Text style={styles.copy}>
              {pending
                ? "Katie will choose the workspace that belongs to you. Once she does, tap Check again."
                : setupRequired
                  ? "Use the private owner setup code once to establish Katie’s account. Trinitie and CatNana will never need it."
                  : "Each person signs in privately. The app remembers you on this iPhone."}
            </Text>
            {setupRequired ? (
              <>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  secureTextEntry
                  placeholder="One-time owner setup code"
                  placeholderTextColor="#8b8075"
                  style={styles.input}
                  inputAccessoryViewID={
                    Platform.OS === "ios" ? LOGIN_KEYBOARD_ACCESSORY : undefined
                  }
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
                <Pressable
                  style={styles.primary}
                  onPress={claimOwner}
                  disabled={busy || code.length < 8}
                >
                  <Text style={styles.primaryText}>
                    {busy ? "Setting up…" : "Make this Katie’s account"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={14}
                style={styles.appleButton}
                onPress={appleSignIn}
              />
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {pending ? (
              <Text style={styles.gentleNote}>
                No shared password. No mystery role picker. Just your own little
                door.
              </Text>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={LOGIN_KEYBOARD_ACCESSORY}>
          <View style={styles.keyboardBar}>
            <Pressable
              onPress={Keyboard.dismiss}
              accessibilityRole="button"
              accessibilityLabel="Close keyboard"
              style={styles.keyboardDone}
            >
              <Text style={styles.keyboardDoneText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function StoryPicker({
  stories,
  selected,
  onSelect,
}: {
  stories: JournalStory[];
  selected?: JournalStory;
  onSelect: (story: JournalStory) => void;
}) {
  const [open, setOpen] = useState(!selected);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>TRAIL JOURNAL STORY</Text>
      {selected && !open ? (
        <Pressable onPress={() => setOpen(true)} style={styles.selectedStory}>
          <View style={{ flex: 1 }}>
            <Text style={styles.storyTitle}>{selected.title}</Text>
            <Text style={styles.storyMeta}>
              {selected.status} ·{" "}
              {new Date(selected.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
          <Text style={styles.change}>Change</Text>
        </Pressable>
      ) : null}
      {open ? (
        <View style={styles.storyList}>
          {stories.map((story) => (
            <Pressable
              key={story.slug}
              onPress={() => {
                onSelect(story);
                setOpen(false);
              }}
              style={[
                styles.storyRow,
                selected?.slug === story.slug && styles.storyRowSelected,
              ]}
            >
              <Text style={styles.storyTitle}>{story.title}</Text>
              <Text style={styles.storyMeta}>
                {story.status} ·{" "}
                {new Date(story.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function readableMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "");
}

function ArticleBody({
  body,
  onSelect,
  notedAnchors = [],
}: {
  body: string;
  onSelect?: (anchor: { id: string; type: "paragraph"; quote: string }) => void;
  notedAnchors?: string[];
}) {
  return (
    <View style={styles.articlePaper}>
      {body.split(/\n{2,}/).map((block, index) => {
        const text = readableMarkdown(block.trim());
        if (!text) return null;
        const anchor = `paragraph-${index}`,
          selected = notedAnchors.includes(anchor),
          tap = onSelect
            ? () =>
                onSelect({
                  id: anchor,
                  type: "paragraph",
                  quote: text.replace(/^## |^> /, ""),
                })
            : undefined;
        if (text.startsWith("## "))
          return (
            <Pressable
              key={index}
              onPress={tap}
              style={selected && styles.reviewAnchorSelected}
            >
              <Text style={styles.articleHeading}>{text.slice(3)}</Text>
            </Pressable>
          );
        if (text.startsWith("> "))
          return (
            <Pressable
              key={index}
              onPress={tap}
              style={selected && styles.reviewAnchorSelected}
            >
              <Text selectable style={styles.articleQuote}>
                {text.slice(2)}
              </Text>
            </Pressable>
          );
        return (
          <Pressable
            key={index}
            onPress={tap}
            style={selected && styles.reviewAnchorSelected}
          >
            <Text selectable style={styles.articleBody}>
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function JournalEditor({
  token,
  story,
  working,
  versions,
  notes,
  media,
  onAdapt,
  onBack,
}: {
  token: string;
  story: JournalStoryDetail;
  working: JournalWorkingDraft | null;
  versions: JournalWorkingVersion[];
  notes: JournalReviewNote[];
  media: SharedMediaAsset[];
  onAdapt: (adaptation: JournalAdaptation) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<JournalTab>("Write"),
    [title, setTitle] = useState(working?.title || story.title),
    [description, setDescription] = useState(
      working?.description || story.description,
    ),
    [category, setCategory] = useState(working?.category || story.category),
    [image, setImage] = useState(working?.image || story.image),
    [imageAlt, setImageAlt] = useState(working?.image_alt || story.imageAlt),
    [body, setBody] = useState(working?.body || story.body),
    [bodySelection, setBodySelection] = useState({ start: 0, end: 0 }),
    [isDraft, setIsDraft] = useState(working?.is_draft ?? story.draft),
    [publishDate, setPublishDate] = useState(
      working?.publish_date || story.date,
    ),
    [revision, setRevision] = useState(working?.revision || 0),
    [dirty, setDirty] = useState(false),
    [saveState, setSaveState] = useState(
      working ? "Synchronized" : "Loaded from GitHub",
    ),
    [saveError, setSaveError] = useState(""),
    [publishing, setPublishing] = useState(false),
    [publishState, setPublishState] = useState<"" | "committed">(""),
    [publishedSlug, setPublishedSlug] = useState(""),
    [reviewState, setReviewState] = useState(working?.review_status || "draft"),
    [reviewSending, setReviewSending] = useState(false),
    [reviewNotes, setReviewNotes] = useState(notes),
    [reviewResponses, setReviewResponses] = useState<Record<string, string>>(
      Object.fromEntries(notes.map((item) => [item.id, item.revised_text || ""])),
    ),
    [responseSaving, setResponseSaving] = useState("");
  const futureSlug = journalPreviewSlug(title, publishDate);
  const journalPhotos = media.filter((asset) => asset.kind === "photo" || asset.content_type.startsWith("image/"));
  const editVersion = useRef(0);
  const localDraftLoaded = useRef(false);
  function localSnapshot(): LocalJournalDraft {
    return {
      storySlug: story.slug,
      serverRevision: revision,
      savedAt: new Date().toISOString(),
      title,
      description,
      category,
      image,
      imageAlt,
      body,
      isDraft,
      publishDate,
    };
  }
  async function persistLocalDraft() {
    await FileSystem.writeAsStringAsync(
      localJournalDraftPath(story.slug),
      JSON.stringify(localSnapshot()),
    );
  }
  function markChanged() {
    editVersion.current += 1;
    setDirty(true);
    setSaveState("Saved on this device");
  }
  function changed(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      markChanged();
    };
  }
  async function synchronize() {
    if (!dirty) return true;
    const savingEdit = editVersion.current;
    setSaveState("Synchronizing…");
    setSaveError("");
    try {
      const data = await saveJournalWorkingDraft(token, {
        slug: story.slug,
        title,
        description,
        category,
        image,
        imageAlt,
        body,
        isDraft,
        publishDate,
        expectedRevision: revision,
      });
      setRevision(data.workingDraft.revision);
      if (editVersion.current === savingEdit) {
        setDirty(false);
        setSaveState("Synchronized");
        await FileSystem.deleteAsync(localJournalDraftPath(story.slug), {
          idempotent: true,
        });
      } else setSaveState("Saved on this device");
      return true;
    } catch (reason) {
      setSaveState("Saved on this device");
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Unable to synchronize this draft.",
      );
      return false;
    }
  }
  async function publishThroughGitHub() {
    if (!checks.every((check) => check.okay)) {
      setSaveError("Finish the gentle review items above before publishing.");
      return;
    }
    setPublishing(true);
    setSaveError("");
    try {
      if (!(await synchronize())) return;
      const result = await publishJournalWorkingDraft(token, story.slug);
      setPublishState(result.state);
      setPublishedSlug(result.slug || futureSlug);
      setSaveState("Committed to GitHub");
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "This story could not be committed to GitHub.",
      );
    } finally {
      setPublishing(false);
    }
  }
  async function sendToCatNana() {
    setReviewSending(true);
    setSaveError("");
    try {
      if (!(await synchronize())) return;
      await requestMomReview(token, story.slug);
      setReviewState("ready_for_mom");
      setSaveState("Sent to CatNana");
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "This draft could not be sent to CatNana.");
    } finally {
      setReviewSending(false);
    }
  }
  async function saveReviewResponse(item: JournalReviewNote) {
    const revisedText = (reviewResponses[item.id] || "").trim();
    if (!revisedText) return;
    setResponseSaving(item.id);
    setSaveError("");
    try {
      const updated = (await updateReviewNote(token, {
        id: item.id,
        status: "open",
        revisedText,
      })).note;
      setReviewNotes((current) => current.map((noteItem) => noteItem.id === updated.id ? updated : noteItem));
      setSaveState("Revised passage attached for CatNana");
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "That response could not be saved.");
    } finally {
      setResponseSaving("");
    }
  }
  async function adaptStory(
    platform: JournalAdaptation["platform"],
  ) {
    setSaveError("");
    if (!(await synchronize())) return;
    onAdapt({
      platform,
      slug: story.slug,
      title: title.trim() || story.title,
      description: description.trim(),
      publishDate,
    });
  }
  useEffect(() => {
    let active = true;
    FileSystem.readAsStringAsync(localJournalDraftPath(story.slug))
      .then((raw) => {
        if (!active || localDraftLoaded.current) return;
        const saved = JSON.parse(raw) as LocalJournalDraft;
        if (
          saved.storySlug !== story.slug ||
          saved.serverRevision !== revision
        )
          return;
        setTitle(saved.title);
        setDescription(saved.description);
        setCategory(saved.category);
        setImage(saved.image);
        setImageAlt(saved.imageAlt);
        setBody(saved.body);
        setIsDraft(saved.isDraft);
        setPublishDate(saved.publishDate);
        editVersion.current += 1;
        setDirty(true);
        setSaveState("Restored from this device");
      })
      .catch(() => {})
      .finally(() => {
        localDraftLoaded.current = true;
      });
    return () => {
      active = false;
    };
  }, [revision, story.slug]);
  useEffect(() => {
    if (!dirty || !localDraftLoaded.current) return;
    const timer = setTimeout(() => {
      persistLocalDraft().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [dirty, title, description, category, image, imageAlt, body, publishDate, isDraft, revision]);
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      synchronize();
    }, 1800);
    return () => clearTimeout(timer);
  }, [dirty, title, description, category, image, imageAlt, body, publishDate, isDraft]);
  function formatBody(kind: "h2" | "h3" | "bold" | "italic" | "link") {
    const before = body.slice(0, bodySelection.start);
    const selected = body.slice(bodySelection.start, bodySelection.end);
    const after = body.slice(bodySelection.end);
    let replacement = selected;
    if (kind === "h2" || kind === "h3") {
      const prefix = kind === "h2" ? "## " : "### ";
      replacement = `${prefix}${selected || "Heading"}`;
    }
    if (kind === "bold") replacement = `**${selected || "bold text"}**`;
    if (kind === "italic") replacement = `*${selected || "italic text"}*`;
    if (kind === "link") replacement = `[${selected || "link text"}](https://)`;
    setBody(`${before}${replacement}${after}`);
    setBodySelection({
      start: before.length,
      end: before.length + replacement.length,
    });
    markChanged();
  }
  async function prepareJournalPhoto(
    asset: SharedMediaAsset,
    destination: "trail-hero" | "trail-article",
  ) {
    setSaveState("Preparing photo…");
    try {
      const version = await saveWorkingVersion(token, asset.id, destination, {
        logoColor: "bark",
        logoSize: "small",
        logoSide: "left",
        focus: "center",
      });
      const path = publicWorkingImagePath(version.id);
      if (destination === "trail-hero") setImage(path);
      else {
        const position = Math.min(bodySelection.start, body.length);
        const markdown = `\n\n![${imageAlt.trim() || "Nomadic Paws Trail Journal photo"}](${path})\n\n`;
        setBody(`${body.slice(0, position)}${markdown}${body.slice(position)}`);
        setBodySelection({
          start: position + markdown.length,
          end: position + markdown.length,
        });
      }
      markChanged();
      setSaveState("Saved on this device");
      setTab(destination === "trail-hero" ? "Photos" : "Write");
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "That Journal photo could not be prepared.",
      );
    }
  }
  const checks = [
    { label: "Title", okay: Boolean(title.trim()) },
    { label: "Excerpt", okay: Boolean(description.trim()) },
    { label: "Hero image", okay: Boolean(image.trim()) },
    { label: "Hero alt text", okay: !image.trim() || Boolean(imageAlt.trim()) },
    { label: "Publish date", okay: !Number.isNaN(Date.parse(publishDate)) },
    { label: "Article body", okay: body.trim().length > 100 },
  ];
  return (
    <View style={styles.editorShell}>
      <View style={styles.editorTop}>
        <Pressable
          onPress={() => {
            if (dirty) persistLocalDraft().finally(onBack);
            else onBack();
          }}
        >
          <Text style={styles.backText}>‹ Stories</Text>
        </Pressable>
        <View style={styles.saveState}>
          <View
            style={[
              styles.saveDot,
              saveState === "Synchronized" && styles.saveDotSynced,
            ]}
          />
          <Text style={styles.saveStateText}>{saveState}</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.editorTabsScroller}
        contentContainerStyle={styles.editorTabs}
      >
        {(["Write", "Photos", "Social", "Publish"] as JournalTab[]).map(
          (item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.editorTab, tab === item && styles.editorTabActive]}
            >
              <Text
                style={[
                  styles.editorTabText,
                  tab === item && styles.editorTabTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ),
        )}
      </ScrollView>
      <ScrollView
        contentContainerStyle={styles.editorPage}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "Write" ? (
          <>
            <TextInput
              value={title}
              onChangeText={changed(setTitle)}
              placeholder="Story title"
              placeholderTextColor="#9a8d80"
              style={styles.editorTitle}
              multiline
            />
            <TextInput
              value={description}
              onChangeText={changed(setDescription)}
              placeholder="Subtitle or excerpt"
              placeholderTextColor="#9a8d80"
              style={styles.editorExcerpt}
              multiline
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.editorToolbar}
              keyboardShouldPersistTaps="always"
            >
              {[
                ["H2", "h2"],
                ["H3", "h3"],
                ["B", "bold"],
                ["I", "italic"],
                ["Link", "link"],
              ].map(([label, kind]) => (
                <Pressable
                  key={kind}
                  onPress={() =>
                    formatBody(
                      kind as "h2" | "h3" | "bold" | "italic" | "link",
                    )
                  }
                  style={styles.editorTool}
                >
                  <Text
                    style={[
                      styles.editorToolText,
                      kind === "bold" && { fontWeight: "900" },
                      kind === "italic" && { fontStyle: "italic" },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.categoryRow}>
              {["Trail Reports", "Cheeto Diaries", "Gear", "Tips"].map(
                (item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setCategory(item);
                      setDirty(true);
                      setSaveState("Saved on this device");
                    }}
                    style={[
                      styles.categoryChoice,
                      category === item && styles.categoryChoiceActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChoiceText,
                        category === item && styles.categoryChoiceTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            <TextInput
              value={body}
              onChangeText={changed(setBody)}
              placeholder="Tell the story…"
              placeholderTextColor="#9a8d80"
              style={styles.editorBody}
              multiline
              textAlignVertical="top"
              selection={bodySelection}
              onSelectionChange={(event) =>
                setBodySelection(event.nativeEvent.selection)
              }
            />
            <Text style={styles.wordCount}>
              {body.trim() ? body.trim().split(/\s+/).length : 0} words
            </Text>
          </>
        ) : null}
        {tab === "Photos" ? (
          <>
            <Text style={styles.eyebrow}>HERO IMAGE</Text>
            <View style={styles.heroEditor}>
              {image ? (
                <Image
                  source={{
                    uri: image.startsWith("http")
                      ? image
                      : `${API_URL}${image}`,
                  }}
                  style={styles.heroEditorImage}
                />
              ) : (
                <View style={styles.heroEditorEmpty}>
                  <Text style={styles.uploadIcon}>▧</Text>
                  <Text style={styles.uploadTitle}>
                    Choose the story’s hero
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.controlLabel}>Image description</Text>
            <TextInput
              value={imageAlt}
              onChangeText={changed(setImageAlt)}
              style={[styles.input, styles.notesInput]}
              multiline
              placeholder="Describe what is visible for screen readers"
              placeholderTextColor="#8b8075"
            />
            <Text style={styles.controlLabel}>
              Choose from the shared Media Library
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.journalMediaRow}
            >
              {journalPhotos.map((asset) => (
                <View key={asset.id} style={styles.journalMediaCard}>
                  <Image
                    source={{
                      uri: privateMediaUrl(asset.id),
                      headers: { Authorization: `Bearer ${token}` },
                    }}
                    style={styles.journalMediaImage}
                  />
                  <Pressable
                    onPress={() => prepareJournalPhoto(asset, "trail-hero")}
                    style={styles.journalMediaAction}
                  >
                    <Text style={styles.journalMediaActionText}>
                      Use as hero
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => prepareJournalPhoto(asset, "trail-article")}
                    style={styles.journalMediaActionSecondary}
                  >
                    <Text style={styles.journalMediaActionTextSecondary}>
                      Add to story
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            {!journalPhotos.length ? (
              <View style={styles.teamEmpty}>
                <Text style={styles.teamEmptyTitle}>No shared photos yet.</Text>
                <Text style={styles.teamEmptyCopy}>
                  Add photos through New Adventure, then they will be available
                  here.
                </Text>
              </View>
            ) : null}
            <Text style={styles.helper}>
              Quick choices use Bark · Small · Left with a centered crop. Use
              Prepare photo in the Media Library first when you want a different
              crop or logo treatment.
            </Text>
            <View style={styles.photoFuture}>
              <Text style={styles.photoFutureTitle}>
                Article photos stay independent
              </Text>
              <Text style={styles.photoFutureCopy}>
                A finished Journal photo is inserted into the story without
                changing its original or its Pinterest version.
              </Text>
            </View>
          </>
        ) : null}
        {tab === "Social" ? (
          <>
            <Text style={styles.eyebrow}>STORY CAMPAIGN</Text>
            <Text style={styles.pageTitle}>Adapt when the story is ready.</Text>
            <Text style={styles.copy}>
              Nothing here changes the writing. Each platform receives its own
              crop, voice, and metadata.
            </Text>
            {([
              ["Pinterest · 4 images", "Pinterest"],
              ["Instagram · hand off in Cheeto’s voice", "Instagram"],
              ["TikTok idea", "TikTok"],
              ["YouTube Short idea", "YouTube Shorts"],
            ] as Array<[string, JournalAdaptation["platform"]]>).map(
              ([label, platform]) => (
              <Pressable
                key={platform}
                onPress={() => adaptStory(platform)}
                style={styles.socialAdapt}
              >
                <Text style={styles.socialAdaptTitle}>{label}</Text>
                <View style={styles.socialAdaptActionRow}>
                  <Text style={styles.socialAdaptAction}>Adapt to…</Text>
                  <Text style={styles.socialAdaptChevron}>›</Text>
                </View>
              </Pressable>
              ),
            )}
          </>
        ) : null}
        {tab === "Publish" ? (
          <>
            <Text style={styles.eyebrow}>FINAL REVIEW</Text>
            <Text style={styles.pageTitle}>Almost ready for the trail.</Text>
            <View style={styles.publishChecks}>
              {checks.map((check) => (
                <View key={check.label} style={styles.publishCheck}>
                  <Text
                    style={[
                      styles.publishCheckIcon,
                      check.okay ? styles.checkOkay : styles.checkMissing,
                    ]}
                  >
                    {check.okay ? "✓" : "○"}
                  </Text>
                  <Text style={styles.publishCheckLabel}>{check.label}</Text>
                  <Text style={styles.publishCheckState}>
                    {check.okay ? "Ready" : "Needs attention"}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.controlLabel}>Publish date and time</Text>
            <TextInput
              value={publishDate}
              onChangeText={changed(setPublishDate)}
              style={styles.input}
            />
            <View style={styles.journalAddressPreview}>
              <Text style={styles.journalAddressLabel}>Story link</Text>
              <Text selectable style={styles.journalAddressValue}>nomadicpaws.co/trail-journal/{publishedSlug || futureSlug}/</Text>
              <Text style={styles.journalAddressLabel}>GitHub file</Text>
              <Text selectable style={styles.journalAddressFile}>_posts/{publishedSlug || futureSlug}.md</Text>
              <Text style={styles.journalAddressHelp}>These update automatically from the title and date. The old address is replaced when you publish.</Text>
            </View>
            <Text style={styles.controlLabel}>Story state</Text>
            <View style={styles.categoryRow}>
              {([
                ["Keep as draft", true],
                ["Ready to publish", false],
              ] as Array<[string, boolean]>).map(([label, value]) => (
                <Pressable
                  key={String(label)}
                  onPress={() => {
                    setIsDraft(value);
                    markChanged();
                  }}
                  style={[
                    styles.categoryChoice,
                    isDraft === value && styles.categoryChoiceActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChoiceText,
                      isDraft === value && styles.categoryChoiceTextActive,
                    ]}
                  >
                    {String(label)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.syncLadder}>
              <Text style={styles.syncLadderTitle}>Publishing state</Text>
              <Text style={styles.syncLadderItem}>✓ Saved on this device</Text>
              <Text style={styles.syncLadderItem}>
                {saveState === "Synchronized" ? "✓" : "○"} Synchronized
              </Text>
              <Text style={styles.syncLadderItem}>
                {publishState === "committed" ? "✓" : "○"} Committed to GitHub
              </Text>
              <Text style={styles.syncLadderItem}>
                {publishState === "committed" ? "◌" : "○"} {publishState === "committed" ? "Netlify deployment started" : "Deployed through Netlify"}
              </Text>
            </View>
            <Pressable
              onPress={synchronize}
              disabled={!dirty}
              style={[styles.primary, !dirty && styles.primaryDisabled]}
            >
              <Text style={styles.primaryText}>
                {dirty ? "Synchronize draft now" : "Draft synchronized"}
              </Text>
            </Pressable>
            <View style={styles.reviewHandoffCard}>
              <Text style={styles.reviewHandoffTitle}>CatNana review</Text>
              <Text style={styles.reviewHandoffCopy}>
                {reviewState === "ready_for_mom"
                  ? "Waiting in CatNana’s Today screen."
                  : reviewState === "back_with_katie"
                    ? "CatNana sent this back. Her passage notes are attached below."
                    : "Send this draft only when you want it to appear in CatNana’s Today screen."}
              </Text>
              {reviewNotes.filter((item) => item.reviewer === "Mom").map((item) => (
                <View key={item.id} style={styles.reviewResponseCard}>
                  {item.quoted_text ? <Text style={styles.anchorQuote}>“{item.quoted_text}”</Text> : null}
                  <Text style={styles.reviewNoteBody}>{item.note}</Text>
                  <Text style={styles.controlLabel}>Passage you revised in response</Text>
                  <TextInput
                    value={reviewResponses[item.id] || ""}
                    onChangeText={(value) => setReviewResponses((current) => ({ ...current, [item.id]: value }))}
                    multiline
                    placeholder="Paste or type only the changed passage"
                    placeholderTextColor="#8b8075"
                    style={[styles.input, styles.notesInput]}
                  />
                  <Pressable
                    disabled={!reviewResponses[item.id]?.trim() || responseSaving === item.id}
                    onPress={() => saveReviewResponse(item)}
                    style={[styles.secondary, (!reviewResponses[item.id]?.trim() || responseSaving === item.id) && styles.primaryDisabled]}
                  >
                    <Text style={styles.secondaryText}>{responseSaving === item.id ? "Saving…" : item.revised_text ? "Update changed passage" : "Save changed passage"}</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={sendToCatNana}
                disabled={reviewSending || reviewState === "ready_for_mom"}
                style={[styles.secondary, (reviewSending || reviewState === "ready_for_mom") && styles.primaryDisabled]}
              >
                <Text style={styles.secondaryText}>
                  {reviewSending ? "Sending…" : reviewState === "ready_for_mom" ? "Ready for CatNana" : "Send to CatNana for review"}
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={publishThroughGitHub}
              disabled={publishing || !checks.every((check) => check.okay)}
              style={[
                styles.publishButton,
                (publishing || !checks.every((check) => check.okay)) &&
                  styles.primaryDisabled,
              ]}
            >
              <Text style={styles.publishButtonText}>
                {publishing
                  ? "Sending to GitHub…"
                  : isDraft
                    ? "Commit this draft to GitHub"
                    : "Publish through GitHub"}
              </Text>
            </Pressable>
            <Text style={styles.gentleNote}>
              Your private publishing key stays on Netlify. The app never stores
              or displays it.
            </Text>
          </>
        ) : null}
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        {versions.length ? (
          <Text style={styles.versionHint}>
            {versions.length} recoverable synchronized version
            {versions.length === 1 ? "" : "s"} available
          </Text>
        ) : null}
        {notes.length ? (
          <Text style={styles.versionHint}>
            {notes.length} review note{notes.length === 1 ? "" : "s"} attached
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

type PendingReviewNote = { anchorId: string; quote: string; note: string };

function MomJournalReview({
  token,
  story,
  working,
  notes,
  onBack,
  onNotes,
  onComplete,
}: {
  token: string;
  story: JournalStoryDetail;
  working: JournalWorkingDraft | null;
  notes: JournalReviewNote[];
  onBack: () => void;
  onNotes: (notes: JournalReviewNote[]) => void;
  onComplete: () => void;
}) {
  const [anchor, setAnchor] = useState<{
      id: string;
      type: "paragraph";
      quote: string;
    }>(),
    [note, setNote] = useState(""),
    [pending, setPending] = useState<PendingReviewNote[]>([]),
    [saving, setSaving] = useState(false),
    [confirming, setConfirming] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const version = working ? `work-${working.revision}` : story.version;
  const changed = notes.filter(
    (item) => item.reviewer === "Mom" && item.revised_text,
  );
  async function queueNote() {
    if (!anchor || !note.trim()) return;
    setPending((current) => [
      ...current.filter((item) => item.anchorId !== anchor.id),
      { anchorId: anchor.id, quote: anchor.quote, note: note.trim() },
    ]);
    setNote("");
    setAnchor(undefined);
    setMessage("✓ Note saved on that passage.");
  }
  async function sendBack() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved: JournalReviewNote[] = [];
      for (const item of pending)
        saved.push(
          (
            await addReviewNote(token, {
              slug: story.slug,
              version,
              reviewer: "Mom",
              note: item.note,
              anchorType: "paragraph",
              anchorId: item.anchorId,
              quotedText: item.quote,
            })
          ).note,
        );
      onNotes([...saved, ...notes]);
      await completeMomReview(token, story.slug);
      setPending([]);
      setMessage(
        "Your notes have been delivered to Katie. She can no longer claim she didn’t know where the comma goes.",
      );
      setConfirming(false);
      onComplete();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to send these notes.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function chooseResolution(
    item: JournalReviewNote,
    status: "resolved" | "needs_work",
  ) {
    try {
      const updated = (await updateReviewNote(token, { id: item.id, status }))
        .note;
      const nextNotes = notes.map((noteItem) => noteItem.id === updated.id ? updated : noteItem);
      onNotes(nextNotes);
      const changedNotes = nextNotes.filter((noteItem) => noteItem.reviewer === "Mom" && noteItem.revised_text);
      if (changedNotes.length && changedNotes.every((noteItem) => noteItem.status === "resolved" || noteItem.status === "needs_work")) {
        await completeMomReview(token, story.slug);
        onComplete();
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save that choice.",
      );
    }
  }
  if (changed.length)
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ All stories</Text>
        </Pressable>
        <Text style={styles.eyebrow}>KATIE MADE CHANGES</Text>
        <Text style={styles.pageTitle}>Only what changed.</Text>
        <Text style={styles.copy}>
          You do not need to reread the whole story. These are the passages
          Katie revised after your notes.
        </Text>
        {changed.map((item) => (
          <View key={item.id} style={styles.changedPassage}>
            <Text style={styles.changedLabel}>
              CHANGED IN RESPONSE TO YOUR NOTE
            </Text>
            <Text style={styles.changedText}>{item.revised_text}</Text>
            <View style={styles.resolutionRow}>
              <Pressable
                onPress={() => chooseResolution(item, "resolved")}
                style={[
                  styles.resolutionButton,
                  item.status === "resolved" && styles.resolutionActive,
                ]}
              >
                <Text
                  style={[
                    styles.resolutionText,
                    item.status === "resolved" && styles.resolutionTextActive,
                  ]}
                >
                  Resolved
                </Text>
              </Pressable>
              <Pressable
                onPress={() => chooseResolution(item, "needs_work")}
                style={[
                  styles.resolutionButton,
                  item.status === "needs_work" && styles.resolutionActive,
                ]}
              >
                <Text
                  style={[
                    styles.resolutionText,
                    item.status === "needs_work" && styles.resolutionTextActive,
                  ]}
                >
                  Still needs work
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    );
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>‹ All stories</Text>
      </Pressable>
      <Text style={styles.eyebrow}>READY FOR YOUR EYES</Text>
      <Text style={styles.pageTitle}>{working?.title || story.title}</Text>
      <Text style={styles.copy}>
        Read at your own pace. Tap a passage when you want to leave Katie a
        note. You can dictate into the note box with the iPhone keyboard
        microphone.
      </Text>
      <ArticleBody
        body={working?.body || story.body}
        onSelect={setAnchor}
        notedAnchors={[
          ...pending.map((item) => item.anchorId),
          ...notes.map((item) => item.anchor_id || ""),
        ]}
      />
      <Modal visible={Boolean(anchor)} transparent animationType="slide" onRequestClose={() => setAnchor(undefined)}>
        <KeyboardAvoidingView style={styles.reviewModalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.reviewModalCard}>
          <Text style={styles.anchorLabel}>NOTE ON THIS PASSAGE</Text>
          <Text style={styles.anchorQuote}>{anchor?.quote || "Selected passage"}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Type or dictate your note…"
            placeholderTextColor="#8b8075"
            style={[styles.input, styles.notesInput]}
          />
          <Pressable
            disabled={!note.trim()}
            onPress={queueNote}
            style={[styles.secondary, !note.trim() && styles.primaryDisabled]}
          >
            <Text style={styles.secondaryText}>Save note on passage</Text>
          </Pressable>
          <Pressable onPress={() => setAnchor(undefined)} style={styles.reviewModalCancel}>
            <Text style={styles.reviewModalCancelText}>Keep reading</Text>
          </Pressable>
        </View>
        </KeyboardAvoidingView>
      </Modal>
      {pending.length ? (
        <Text style={styles.pendingCount}>
          {pending.length} passage note{pending.length === 1 ? "" : "s"} ready
          to send
        </Text>
      ) : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.reviewFinishPrompt}>Finished adding notes and comments?</Text>
      <Pressable disabled={saving} onPress={() => setConfirming(true)} style={styles.primary}>
        <Text style={styles.primaryText}>
          {saving ? "Sending…" : "Send back to Katie"}
        </Text>
      </Pressable>
      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.reviewModalBackdrop}>
          <View style={styles.reviewConfirmCard}>
            <Text style={styles.reviewHandoffTitle}>Are you finished adding notes and comments?</Text>
            <Text style={styles.reviewHandoffCopy}>Sending this back removes it from your Today screen and returns it to Katie’s draft editing queue.</Text>
            <Pressable disabled={saving} onPress={sendBack} style={styles.primary}>
              <Text style={styles.primaryText}>{saving ? "Sending…" : "Yes, send back to Katie"}</Text>
            </Pressable>
            <Pressable onPress={() => setConfirming(false)} style={styles.reviewModalCancel}>
              <Text style={styles.reviewModalCancelText}>Keep reviewing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const nanaIdeas = [
  "What Katie and Cheeto have taught each other",
  "A Cheeto memory that still makes you laugh",
  "The first time you realized their bond was special",
  "A family story Cheeto somehow became part of",
];

function CatNanaWriter({
  token,
  contribution,
  onBack,
  onSaved,
}: {
  token: string;
  contribution?: JournalContribution;
  onBack: () => void;
  onSaved: (item: JournalContribution) => void;
}) {
  const [id, setId] = useState(contribution?.id || ""),
    [title, setTitle] = useState(contribution?.title || ""),
    [body, setBody] = useState(contribution?.body || ""),
    [clue, setClue] = useState(contribution?.memory_clue || ""),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(status: "draft" | "submitted") {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = (
        await saveJournalContribution(token, {
          id,
          title,
          body,
          memoryClue: clue,
          status,
        })
      ).contribution;
      setId(saved.id);
      onSaved(saved);
      setMessage(
        status === "draft"
          ? "Saved gently. It will be here whenever you return."
          : "Sent to Katie as a CatNana contribution—not a finished article.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save this thought.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>‹ Mom’s Journal</Text>
      </Pressable>
      <Text style={styles.eyebrow}>ONLY IF YOU FEEL LIKE IT</Text>
      <Text style={styles.pageTitle}>Write for the Journal.</Text>
      <Text style={styles.copy}>
        Share a memory, a family story, or something only you would notice.
        There is no deadline and unfinished thoughts are welcome.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.nanaIdeas}
      >
        {nanaIdeas.map((idea) => (
          <Pressable
            key={idea}
            onPress={() => {
              if (!title) setTitle(idea);
            }}
            style={styles.nanaIdea}
          >
            <Text style={styles.nanaIdeaText}>{idea}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.controlLabel}>Working title · optional</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="A few words to remember it by"
        placeholderTextColor="#8b8075"
      />
      <Text style={styles.controlLabel}>Your story or thought</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.nanaBody]}
        placeholder="Type or dictate freely…"
        placeholderTextColor="#8b8075"
      />
      <Text style={styles.controlLabel}>
        Anything that might help Katie identify this memory? · optional
      </Text>
      <TextInput
        value={clue}
        onChangeText={setClue}
        multiline
        style={[styles.input, styles.notesInput]}
        placeholder="A place, event, season, or little detail"
        placeholderTextColor="#8b8075"
      />
      <View style={styles.photoBelongsKatie}>
        <Text style={styles.photoBelongsTitle}>Photos belong to Katie.</Text>
        <Text style={styles.photoBelongsCopy}>
          You do not need to find any. Katie will connect this memory to an
          adventure and choose what it needs from the Media Library.
        </Text>
      </View>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        disabled={saving}
        onPress={() => save("draft")}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>Save unfinished thought</Text>
      </Pressable>
      <Pressable
        disabled={saving || !body.trim()}
        onPress={() => save("submitted")}
        style={[styles.primary, !body.trim() && styles.primaryDisabled]}
      >
        <Text style={styles.primaryText}>Send to Katie when ready</Text>
      </Pressable>
    </ScrollView>
  );
}

function Journal({
  token,
  person,
  onAdapt,
  initialStorySlug,
  onInitialStoryOpened,
}: {
  token: string;
  person: Person;
  onAdapt: (adaptation: JournalAdaptation) => void;
  initialStorySlug?: string;
  onInitialStoryOpened: () => void;
}) {
  const [stories, setStories] = useState<JournalStory[]>([]),
    [selected, setSelected] = useState<JournalStoryDetail>(),
    [working, setWorking] = useState<JournalWorkingDraft | null>(null),
    [versions, setVersions] = useState<JournalWorkingVersion[]>([]),
    [notes, setNotes] = useState<JournalReviewNote[]>([]),
    [reviewNote, setReviewNote] = useState(""),
    [loading, setLoading] = useState(true),
    [opening, setOpening] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [contributions, setContributions] = useState<JournalContribution[]>([]),
    [nanaWriting, setNanaWriting] = useState(false),
    [creatingStory, setCreatingStory] = useState(false),
    [newStoryTitle, setNewStoryTitle] = useState(""),
    [newStoryCategory, setNewStoryCategory] = useState("Cheeto Diaries"),
    [newStoryDate, setNewStoryDate] = useState(localDateKey());
  const [journalMedia, setJournalMedia] = useState<SharedMediaAsset[]>([]);
  useEffect(() => {
    loadStories(token)
      .then((data) =>
        setStories(
          person === "Katie"
            ? data.stories
            : person === "Mom"
              ? data.stories.filter((story) => story.reviewStatus === "ready_for_mom")
              : data.stories.filter((story) => story.status !== "Published"),
        ),
      )
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [person, token]);
  useEffect(() => {
    if (person !== "Katie") return;
    loadSharedMedia(token)
      .then((data) => setJournalMedia(data.media))
      .catch((reason) => setError(reason.message));
  }, [person, token]);
  useEffect(() => {
    if (person === "Trinitie") return;
    loadJournalContributions(token)
      .then((data) => setContributions(data.contributions))
      .catch((reason) => setError(reason.message));
  }, [person, token]);
  async function open(story: JournalStory) {
    setOpening(true);
    setError("");
    try {
      const data = await loadStory(token, story.slug);
      setSelected(data.story);
      setNotes(data.notes);
      setWorking(data.workingDraft);
      setVersions(data.versions);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to open this story.",
      );
    } finally {
      setOpening(false);
    }
  }
  useEffect(() => {
    if (!initialStorySlug || !stories.length || selected) return;
    const story = stories.find((item) => item.slug === initialStorySlug);
    if (!story) return;
    open(story);
    onInitialStoryOpened();
  }, [initialStorySlug, onInitialStoryOpened, selected, stories]);
  async function beginStory() {
    if (!newStoryTitle.trim()) return;
    setOpening(true);
    setError("");
    try {
      const data = await createJournalStory(token, {
        title: newStoryTitle.trim(),
        category: newStoryCategory,
        publishDate: newStoryDate,
      });
      const { body: _body, ...summary } = data.story;
      setStories((current) => [summary, ...current]);
      setSelected(data.story);
      setWorking(data.workingDraft);
      setVersions(data.versions);
      setNotes(data.notes);
      setCreatingStory(false);
      setNewStoryTitle("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "This Journal story could not be started.",
      );
    } finally {
      setOpening(false);
    }
  }
  const reviewVersion = working
    ? `work-${working.revision}`
    : selected?.version || "";
  async function submitReview() {
    if (!selected || person === "Katie" || !reviewNote.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await addReviewNote(token, {
        slug: selected.slug,
        version: reviewVersion,
        reviewer: person,
        note: reviewNote.trim(),
      });
      setNotes((current) => [data.note, ...current]);
      setReviewNote("");
      setMessage("Your review note is saved.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save this note.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.terracotta} />
        <Text style={styles.helper}>Opening the real Trail Journal…</Text>
      </View>
    );
  if (person === "Mom" && nanaWriting)
    return (
      <CatNanaWriter
        token={token}
        contribution={contributions.find((item) => item.status === "draft")}
        onBack={() => setNanaWriting(false)}
        onSaved={(item) =>
          setContributions((current) => [
            item,
            ...current.filter((existing) => existing.id !== item.id),
          ])
        }
      />
    );
  if (selected && person === "Katie")
    return (
      <JournalEditor
        token={token}
        story={selected}
        working={working}
        versions={versions}
        notes={notes}
        media={journalMedia}
        onAdapt={onAdapt}
        onBack={() => setSelected(undefined)}
      />
    );
  if (selected && person === "Mom")
    return (
      <MomJournalReview
        token={token}
        story={selected}
        working={working}
        notes={notes}
        onNotes={setNotes}
        onBack={() => setSelected(undefined)}
        onComplete={() => {
          setStories((current) => current.filter((item) => item.slug !== selected.slug));
          setSelected(undefined);
        }}
      />
    );
  if (selected)
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => setSelected(undefined)}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ All stories</Text>
        </Pressable>
        <View style={styles.journalStatusRow}>
          <View style={styles.journalStatus}>
            <Text style={styles.journalStatusText}>{selected.status}</Text>
          </View>
          <Text style={styles.journalDate}>
            {new Date(selected.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
        <Text style={styles.pageTitle}>{working?.title || selected.title}</Text>
        {working?.description || selected.description ? (
          <Text style={styles.copy}>
            {working?.description || selected.description}
          </Text>
        ) : null}
        <ArticleBody body={working?.body || selected.body} />
        <View style={styles.reviewSection}>
          <Text style={styles.listTitle}>Review notes</Text>
          {notes.length ? (
            notes.map((note) => (
              <View key={note.id} style={styles.reviewNote}>
                <View style={styles.reviewNoteTop}>
                  <Text style={styles.reviewAuthor}>{note.reviewer}</Text>
                  <Text style={styles.reviewVersion}>
                    {note.story_version === reviewVersion
                      ? `Version ${reviewVersion}`
                      : "Earlier version"}
                  </Text>
                </View>
                <Text style={styles.reviewNoteBody}>{note.note}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyReview}>No review notes yet.</Text>
          )}
          {person !== "Katie" ? (
            <>
              <Text style={styles.controlLabel}>
                Leave a note on version {reviewVersion}
              </Text>
              <TextInput
                value={reviewNote}
                onChangeText={setReviewNote}
                multiline
                placeholder="What stood out? Is anything unclear?"
                placeholderTextColor="#8b8075"
                style={[styles.input, styles.notesInput]}
              />
              {message ? <Text style={styles.success}>{message}</Text> : null}
              <Pressable
                disabled={!reviewNote.trim() || saving}
                onPress={submitReview}
                style={[
                  styles.primary,
                  (!reviewNote.trim() || saving) && styles.primaryDisabled,
                ]}
              >
                <Text style={styles.primaryText}>
                  {saving ? "Saving…" : "Save review note"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.gentleNote}>
              Trinitie’s and Mom’s notes stay separate and remain attached to
              the version they reviewed.
            </Text>
          )}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>
        {person === "Katie" ? "TRAIL JOURNAL" : "TRAIL JOURNAL REVIEW"}
      </Text>
      <Text style={styles.pageTitle}>
        {person === "Katie" ? "Stories in progress." : "A quiet place to read."}
      </Text>
      <Text style={styles.copy}>
        {person === "Katie"
          ? "Your existing drafts, scheduled stories, and published Journal are connected here."
          : "Read Katie’s unpublished stories and leave notes without changing the draft."}
      </Text>
      {person === "Katie" ? (
        creatingStory ? (
          <View style={styles.newStoryCard}>
            <Text style={styles.newStoryTitle}>Begin a Journal story</Text>
            <Text style={styles.controlLabel}>Working title</Text>
            <TextInput
              autoFocus
              value={newStoryTitle}
              onChangeText={setNewStoryTitle}
              placeholder="The adventure you want to remember"
              placeholderTextColor="#8b8075"
              style={styles.input}
            />
            <Text style={styles.controlLabel}>Story type</Text>
            <View style={styles.categoryRow}>
              {["Trail Reports", "Cheeto Diaries", "Gear", "Tips"].map(
                (item) => (
                  <Pressable
                    key={item}
                    onPress={() => setNewStoryCategory(item)}
                    style={[
                      styles.categoryChoice,
                      newStoryCategory === item && styles.categoryChoiceActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChoiceText,
                        newStoryCategory === item &&
                          styles.categoryChoiceTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            <Text style={styles.controlLabel}>Target Sunday · editable</Text>
            <TextInput
              value={newStoryDate}
              onChangeText={setNewStoryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8b8075"
              style={styles.input}
            />
            <Pressable
              disabled={!newStoryTitle.trim() || opening}
              onPress={beginStory}
              style={[
                styles.primary,
                (!newStoryTitle.trim() || opening) && styles.primaryDisabled,
              ]}
            >
              <Text style={styles.primaryText}>
                {opening ? "Opening your writing desk…" : "Start writing"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setCreatingStory(false)}>
              <Text style={styles.laterText}>Not yet</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setCreatingStory(true)}
            style={styles.newStoryButton}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.adventureEyebrow}>NEW JOURNAL STORY</Text>
              <Text style={styles.adventureTitle}>Open a clean writing desk</Text>
              <Text style={styles.adventureCopy}>
                Begin here, autosave privately, and publish only when you choose.
              </Text>
            </View>
            <Text style={styles.adventurePlus}>＋</Text>
          </Pressable>
        )
      ) : null}
      {person === "Mom" ? (
        <Pressable
          onPress={() => setNanaWriting(true)}
          style={styles.nanaInvite}
        >
          <Text style={styles.nanaInviteEyebrow}>CATNANA’S CORNER</Text>
          <Text style={styles.nanaInviteTitle}>Write for the Journal</Text>
          <Text style={styles.nanaInviteCopy}>
            Share a memory or begin a thought whenever you feel like it. No
            deadline.
          </Text>
        </Pressable>
      ) : null}
      {person === "Katie" &&
      contributions.filter((item) => item.status === "submitted").length ? (
        <View style={styles.contributionSection}>
          <Text style={styles.listTitle}>From CatNana</Text>
          {contributions
            .filter((item) => item.status === "submitted")
            .map((item) => (
              <View key={item.id} style={styles.contributionCard}>
                <Text style={styles.contributionStatus}>
                  CATNANA CONTRIBUTION
                </Text>
                <Text style={styles.contributionTitle}>
                  {item.title || "A memory from CatNana"}
                </Text>
                <Text numberOfLines={3} style={styles.contributionBody}>
                  {item.body}
                </Text>
                <View style={styles.contributionPrompts}>
                  <Text style={styles.contributionPrompt}>
                    Connect to an adventure
                  </Text>
                  <Text style={styles.contributionPrompt}>
                    Choose Media Library photos
                  </Text>
                  <Text style={styles.contributionPrompt}>
                    Edit before publishing
                  </Text>
                </View>
              </View>
            ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {opening ? <ActivityIndicator color={colors.terracotta} /> : null}
      <View style={styles.journalList}>
        {stories.map((story) => (
          <Pressable
            key={story.slug}
            onPress={() => open(story)}
            style={styles.journalRow}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.journalStatus}>
                <Text style={styles.journalStatusText}>{story.status}</Text>
              </View>
              <Text style={styles.seedTitle}>{story.title}</Text>
              <Text style={styles.storyMeta}>
                {new Date(story.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {story.category ? ` · ${story.category}` : ""}
              </Text>
            </View>
            <Text style={styles.journalArrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function PinCard({
  token,
  media,
  number,
  value,
  onChange,
  onChooseFromPhotos,
  uploading,
}: {
  token: string;
  media: SharedMediaAsset[];
  number: number;
  value: PinterestPinDraft;
  onChange: (value: PinterestPinDraft) => void;
  onChooseFromPhotos: () => void;
  uploading: boolean;
}) {
  const patch = (next: Partial<PinterestPinDraft>) =>
    onChange({ ...value, ...next });
  return (
    <View style={styles.pinCard}>
      <View style={styles.pinHeading}>
        <Text style={styles.pinTitle}>Pin {number}</Text>
        <Text style={styles.pinTiming}>
          {number === 1
            ? "RSS · within 24 hours"
            : `CSV · day ${(number - 1) * 7}`}
        </Text>
      </View>
      <View style={styles.preview}>
        {value.asset ? (
          <Image
            source={{
              uri: privateMediaUrl(value.asset.id),
              headers: { Authorization: `Bearer ${token}` },
            }}
            resizeMode="cover"
            style={[
              styles.previewPhoto,
              value.focus === "top" && styles.previewFocusTop,
              value.focus === "bottom" && styles.previewFocusBottom,
            ]}
          />
        ) : value.finishedImage ? (
          <Image
            source={{
              uri: value.finishedImage.startsWith("http")
                ? value.finishedImage
                : `${API_URL}${value.finishedImage}`,
            }}
            style={styles.previewPhoto}
          />
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyIcon}>＋</Text>
            <Text style={styles.emptyText}>Add a vertical photo</Text>
          </View>
        )}
        <Image
          source={{ uri: `${API_URL}/images/pinterest-logos/logo-${value.logo}.png` }}
          style={[
            styles.previewLogo,
            value.size === "medium" ? styles.logoMedium : styles.logoSmall,
            value.side === "right" ? styles.logoRight : styles.logoLeft,
          ]}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.controlLabel}>Choose a photo</Text>
      <Pressable
        disabled={uploading}
        onPress={onChooseFromPhotos}
        style={styles.pinDirectUpload}
      >
        <Text style={styles.pinDirectUploadText}>
          {uploading ? "Adding original…" : "Choose a different photo from iPhone Photos"}
        </Text>
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pinMediaRow}
      >
        {media.map((asset) => (
          <Pressable
            key={asset.id}
            onPress={() => patch({ asset, finishedImage: undefined })}
            style={[
              styles.pinMediaChoice,
              value.asset?.id === asset.id && styles.pinMediaChoiceActive,
            ]}
          >
            <Image
              source={{
                uri: privateMediaUrl(asset.id),
                headers: { Authorization: `Bearer ${token}` },
              }}
              style={styles.pinMediaThumb}
            />
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.controlLabel}>Pin title</Text>
      <TextInput
        value={value.title}
        onChangeText={(title) => patch({ title })}
        maxLength={100}
        style={styles.input}
        placeholder="A clear, searchable title"
        placeholderTextColor="#8b8075"
      />
      <Text style={styles.controlLabel}>Description</Text>
      <TextInput
        value={value.description}
        onChangeText={(description) => patch({ description })}
        maxLength={500}
        multiline
        style={[styles.input, styles.notesInput]}
        placeholder="What the story offers and why someone may want to save it"
        placeholderTextColor="#8b8075"
      />
      <Text style={styles.controlLabel}>Logo color</Text>
      <View style={styles.choiceRow}>
        {logoChoices.map((item) => (
          <Choice
            key={item.value}
            {...item}
            current={value.logo}
            onPress={(logo) => patch({ logo })}
          />
        ))}
      </View>
      <Text style={styles.controlLabel}>Logo size</Text>
      <View style={styles.choiceRow}>
        <Choice value="small" label="Small" current={value.size} onPress={(size) => patch({ size })} />
        <Choice
          value="medium"
          label="Medium"
          current={value.size}
          onPress={(size) => patch({ size })}
        />
      </View>
      <Text style={styles.controlLabel}>Logo placement</Text>
      <View style={styles.choiceRow}>
        <Choice value="left" label="Left" current={value.side} onPress={(side) => patch({ side })} />
        <Choice value="right" label="Right" current={value.side} onPress={(side) => patch({ side })} />
      </View>
      <Text style={styles.controlLabel}>Protected focal point</Text>
      <View style={styles.choiceRow}>
        {(["top", "center", "bottom"] as const).map((focus) => (
          <Choice
            key={focus}
            value={focus}
            label={focus[0]!.toUpperCase() + focus.slice(1)}
            current={value.focus}
            onPress={(next) => patch({ focus: next })}
          />
        ))}
      </View>
    </View>
  );
}

const statusTone: Record<
  ContentSeed["status"],
  { backgroundColor: string; color: string }
> = {
  Idea: { backgroundColor: "#efe9de", color: colors.barkSoft },
  Draft: { backgroundColor: "#f7e6dc", color: colors.terracottaDeep },
  Ready: { backgroundColor: "#e6eee0", color: colors.sageDeep },
  "Handed Off": { backgroundColor: "#e7edf1", color: "#526b78" },
  Posted: { backgroundColor: "#eee8f3", color: "#685675" },
};

function SeedCard({ seed }: { seed: ContentSeed }) {
  const tone = statusTone[seed.status];
  return (
    <Pressable
      style={styles.seedCard}
      accessibilityLabel={`${seed.title}, ${seed.status}, assigned to ${seed.assignedTo}`}
    >
      <View style={styles.seedTop}>
        <View
          style={[styles.seedStatus, { backgroundColor: tone.backgroundColor }]}
        >
          <Text style={[styles.seedStatusText, { color: tone.color }]}>
            {seed.status}
          </Text>
        </View>
        <Text style={styles.seedOwner}>{seed.assignedTo}</Text>
      </View>
      <Text style={styles.seedTitle}>{seed.title}</Text>
      <Text style={styles.seedNote}>{seed.note}</Text>
      <View style={styles.seedMeta}>
        <Text style={styles.seedMetaText}>{seed.mediaCount} media</Text>
        <Text style={styles.seedMetaText}>{seed.capturedAt}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.platforms}
      >
        {seed.platforms.map((platform) => (
          <View key={platform} style={styles.platformPill}>
            <Text style={styles.platformText}>{platform}</Text>
          </View>
        ))}
      </ScrollView>
    </Pressable>
  );
}

function dateKeyFrom(value: string) {
  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

function shiftedDateKey(value: string, days: number) {
  const key = dateKeyFrom(value);
  if (!key) return "";
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function calendarHeading(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const today = localDateKey();
  const tomorrow = shiftedDateKey(today, 1);
  const prefix = value === today ? "Today · " : value === tomorrow ? "Tomorrow · " : "";
  return `${prefix}${date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })}`;
}

function ContentCalendar({
  token,
  person,
  onClose,
}: {
  token: string;
  person: Person;
  onClose: () => void;
}) {
  const [stories, setStories] = useState<JournalStory[]>([]);
  const [posts, setPosts] = useState<InstagramPostDraft[]>([]);
  const [campaigns, setCampaigns] = useState<PinterestCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      loadStories(token),
      person === "Mom"
        ? Promise.resolve({ posts: [] as InstagramPostDraft[] })
        : loadInstagramStudio(token),
      person === "Katie"
        ? loadPinterestCampaigns(token)
        : Promise.resolve({ campaigns: [] as PinterestCampaign[] }),
    ])
      .then(([journal, instagram, pinterest]) => {
        if (!active) return;
        setStories(journal.stories);
        setPosts(instagram.posts);
        setCampaigns(pinterest.campaigns);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "The shared calendar could not synchronize.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [person, token]);

  const items = useMemo(() => {
    const next: CalendarItem[] = stories
      .map((story) => ({
        id: `journal-${story.slug}`,
        date: dateKeyFrom(story.date),
        title: story.title,
        platform: "Trail Journal" as const,
        status: story.status,
        detail:
          story.status === "Published"
            ? "Public Trail Journal story"
            : story.status === "Scheduled"
              ? "Scheduled publication"
              : "Working publication date",
      }))
      .filter((item) => item.date);

    if (person !== "Mom") {
      posts.forEach((post) => {
        if (!post.targetDate) return;
        next.push({
          id: `instagram-${post.id}`,
          date: post.targetDate,
          title: post.title,
          platform: "Instagram",
          status: post.status,
          detail: `${post.theme || "Instagram"} · ${post.assignedTo}`,
        });
      });
    }

    if (person === "Katie") {
      const storyDates = new Map(stories.map((story) => [story.slug, story.date]));
      campaigns.forEach((campaign) => {
        if (!campaign.enabled || campaign.retroactive) return;
        const articleDate = storyDates.get(campaign.post_slug) || "";
        [
          { days: 0, label: "RSS Pin" },
          { days: 7, label: "+7 day Pin" },
          { days: 14, label: "+14 day Pin" },
          { days: 21, label: "+21 day Pin" },
        ].forEach(({ days, label }) => {
          const date = shiftedDateKey(articleDate, days);
          if (!date) return;
          next.push({
            id: `pinterest-${campaign.post_slug}-${days}`,
            date,
            title: campaign.campaign_title,
            platform: "Pinterest",
            status: label,
            detail:
              days === 0
                ? "Releases only after the article is public"
                : `${campaign.board} · CSV`,
          });
        });
      });
    }

    const recentCutoff = shiftedDateKey(localDateKey(), -7);
    return next
      .filter((item) => item.date >= recentCutoff)
      .sort((a, b) =>
        a.date === b.date
          ? a.platform.localeCompare(b.platform)
          : a.date.localeCompare(b.date),
      );
  }, [campaigns, person, posts, stories]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CalendarItem[]>();
    items.forEach((item) =>
      groups.set(item.date, [...(groups.get(item.date) || []), item]),
    );
    return [...groups.entries()];
  }, [items]);
  const retroactive = campaigns.filter(
    (campaign) => campaign.enabled && campaign.retroactive,
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable onPress={onClose} style={styles.backButton}>
        <Text style={styles.backText}>‹ Today</Text>
      </Pressable>
      <Text style={styles.eyebrow}>SHARED CONTENT CALENDAR</Text>
      <Text style={styles.pageTitle}>
        {person === "Trinitie"
          ? "Your Instagram days, in one place."
          : person === "Mom"
            ? "Journal dates at a glance."
            : "The whole trail ahead."}
      </Text>
      <Text style={styles.copy}>
        Dates stay connected to the real Journal and studio records. Moving a
        story date moves its regular Pinterest follow-ups automatically.
      </Text>
      {loading ? (
        <View style={styles.calendarLoading}>
          <ActivityIndicator color={colors.terracotta} />
          <Text style={styles.helper}>Gathering the real schedule…</Text>
        </View>
      ) : error ? (
        <View style={styles.calendarNotice}>
          <Text style={styles.calendarNoticeTitle}>Calendar paused</Text>
          <Text style={styles.calendarNoticeCopy}>{error}</Text>
        </View>
      ) : grouped.length ? (
        grouped.map(([date, dateItems]) => (
          <View key={date} style={styles.calendarDay}>
            <Text style={styles.calendarDate}>{calendarHeading(date)}</Text>
            {dateItems.map((item) => (
              <View key={item.id} style={styles.calendarItem}>
                <View
                  style={[
                    styles.calendarMarker,
                    item.platform === "Instagram"
                      ? styles.calendarMarkerInstagram
                      : item.platform === "Pinterest"
                        ? styles.calendarMarkerPinterest
                        : styles.calendarMarkerJournal,
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.calendarItemTop}>
                    <Text style={styles.calendarPlatform}>{item.platform}</Text>
                    <Text style={styles.calendarStatus}>{item.status}</Text>
                  </View>
                  <Text style={styles.calendarTitle}>{item.title}</Text>
                  <Text style={styles.calendarDetail}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        ))
      ) : (
        <View style={styles.calendarNotice}>
          <Text style={styles.calendarNoticeTitle}>The trail ahead is open.</Text>
          <Text style={styles.calendarNoticeCopy}>
            Scheduled Journal stories and Instagram posts will gather here.
          </Text>
        </View>
      )}
      {person === "Katie" && retroactive ? (
        <View style={styles.calendarNotice}>
          <Text style={styles.calendarNoticeTitle}>
            {retroactive} retroactive Pinterest campaign
            {retroactive === 1 ? "" : "s"}
          </Text>
          <Text style={styles.calendarNoticeCopy}>
            Their exact dates are assigned to the next open CSV slots when the
            export is generated, so the calendar does not invent dates for them.
          </Text>
        </View>
      ) : null}
      <Text style={styles.gentleNote}>
        No overdue language. This is a map, not a manager.
      </Text>
    </ScrollView>
  );
}

function Today({
  token,
  person,
  seeds,
  onNewAdventure,
  onOpenPreviews,
  onOpenCalendar,
  onOpenInstagramPost,
  onOpenJournalStory,
}: {
  token: string;
  person: Person;
  seeds: ContentSeed[];
  onNewAdventure: () => void;
  onOpenPreviews: () => void;
  onOpenCalendar: () => void;
  onOpenInstagramPost: (postId: string) => void;
  onOpenJournalStory: (slug: string) => void;
}) {
  const [rhythm, setRhythm] = useState<InstagramDay[]>(initialInstagramRhythm);
  const [posts, setPosts] = useState<InstagramPostDraft[]>([]);
  const [reviewStories, setReviewStories] = useState<JournalStory[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadMessage, setLoadMessage] = useState("");
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateHeading = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
  const todayTheme = rhythm.find((item) => item.day === weekday);
  async function refreshToday() {
    setLoadState("loading");
    setLoadMessage("");
    try {
      const [instagram, journal] = await Promise.all([
        loadInstagramStudio(token),
        person === "Mom" ? loadStories(token) : Promise.resolve(null),
      ]);
      if (instagram.rhythm) setRhythm(instagram.rhythm);
      setPosts(instagram.posts);
      if (journal) setReviewStories(journal.stories.filter((story) => story.reviewStatus === "ready_for_mom"));
      setLoadState("ready");
    } catch (reason) {
      setLoadState("error");
      setLoadMessage(reason instanceof Error ? reason.message : "Today’s shared work could not be opened.");
    }
  }
  useEffect(() => {
    refreshToday();
  }, [person, token]);
  const mine =
    person === "Mom"
      ? []
      : seeds.filter((seed) => seed.assignedTo === person);
  const readyInstagram = posts.filter(
    (post) => post.status === "Ready" && post.targetDate === localDateKey(),
  ).length;
  const needsKatie = posts.filter(
    (post) => post.assignedTo === "Katie" && post.status !== "Posted",
  );
  const visibleTodayCount = person === "Trinitie"
    ? mine.length + posts.filter((post) => post.targetDate === localDateKey() && post.status !== "Posted").length
    : person === "Mom"
      ? reviewStories.length + posts.filter((post) => post.sharedWithMom).length
      : mine.length + needsKatie.length;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.todayHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{dateHeading}</Text>
          <Text style={styles.pageTitle}>
            Good morning, {person === "Mom" ? "CatNana" : person}.
          </Text>
        </View>
        <Pressable onPress={onOpenCalendar} style={styles.calendarButton}>
          <Text style={styles.calendarButtonDay}>{new Date().getDate()}</Text>
          <Text style={styles.calendarButtonLabel}>Calendar</Text>
        </Pressable>
      </View>
      <Text style={styles.copy}>
        {person === "Trinitie"
          ? "Your Instagram desk is calm and ready when inspiration arrives."
          : person === "Mom"
            ? "A quiet place to read Katie’s Trail Journal drafts and leave review notes."
            : "Your stories, campaigns, and Cheeto adventures are gathered in one place."}
      </Text>
      {loadState === "loading" ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={colors.terracotta} />
          <Text style={styles.helper}>Opening today’s shared work…</Text>
        </View>
      ) : loadState === "error" ? (
        <View style={styles.retryCard}>
          <Text style={styles.error}>{loadMessage}</Text>
          <Pressable onPress={refreshToday} style={styles.secondary}>
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {person === "Katie" ? (
        <>
          <Pressable style={styles.adventureButton} onPress={onNewAdventure}>
            <View>
              <Text style={styles.adventureEyebrow}>ADVENTURE INBOX</Text>
              <Text style={styles.adventureTitle}>Start a new adventure</Text>
              <Text style={styles.adventureCopy}>
                Add selected photos, videos, notes, and a private location.
              </Text>
            </View>
            <Text style={styles.adventurePlus}>＋</Text>
          </Pressable>
          <View style={styles.uploadReminder}>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadReminderTitle}>
                Yesterday’s adventure may have media to add.
              </Text>
              <Text style={styles.uploadReminderCopy}>
                Add it when you have a quiet minute.
              </Text>
            </View>
            <Pressable
              onPress={onNewAdventure}
              style={styles.uploadReminderAction}
            >
              <Text style={styles.uploadReminderActionText}>Add now</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.trinitieFocus}>
          <Text style={styles.trinitieFocusTitle}>
            {person === "Mom"
              ? "Trail Journal review only."
              : todayTheme?.enabled
                ? todayTheme.theme
                : "Today can stay open."}
          </Text>
          <Text style={styles.trinitieFocusCopy}>
            {person === "Mom"
              ? "Read drafts, leave notes, and mark your review complete without entering the publishing workflow."
              : todayTheme?.enabled
                ? `${weekday}’s theme is ready, along with the Instagram-ready moments Katie has shared.`
                : `${weekday} is turned off in your weekly rhythm. Nothing needs to be filled just for the sake of posting.`}
          </Text>
        </View>
      )}
      <View style={styles.readinessRow}>
        <Pressable
          onPress={onOpenPreviews}
          style={[styles.readinessCard, styles.readinessCardActive]}
        >
          <Text style={styles.readinessNumber}>
            {person === "Trinitie"
              ? readyInstagram
              : person === "Mom"
                ? reviewStories.length + posts.filter((post) => post.sharedWithMom).length
                : needsKatie.length}
          </Text>
          <Text style={styles.readinessLabel}>
            {person === "Trinitie"
              ? readyInstagram === 1
                ? "Post ready"
                : "Posts ready"
              : person === "Mom"
                ? "Ready & shared"
                : "Needs Katie"}
          </Text>
        </Pressable>
        <View style={styles.readinessCard}>
          <Text style={styles.readinessNumber}>
            {initialSchedule.socialDay.slice(0, 3)}
          </Text>
          <Text style={styles.readinessLabel}>Social target</Text>
        </View>
        <View style={styles.readinessCard}>
          <Text style={styles.readinessNumber}>
            {initialSchedule.journalDay.slice(0, 3)}
          </Text>
          <Text style={styles.readinessLabel}>Journal target</Text>
        </View>
      </View>
      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>
          {person === "Trinitie"
            ? "Your studio"
            : person === "Mom"
              ? "Ready to review"
              : "In your hands"}
        </Text>
        <Text style={styles.listCount}>
          {visibleTodayCount} item{visibleTodayCount === 1 ? "" : "s"}
        </Text>
      </View>
      {loadState === "ready" && visibleTodayCount === 0 ? (
        <View style={styles.emptyTodayCard}>
          <Text style={styles.emptyTodayTitle}>
            {person === "Mom" ? "Nothing is waiting for you." : "Your desk is clear."}
          </Text>
          <Text style={styles.emptyTodayCopy}>
            {person === "Mom"
              ? "A Journal review or shared Instagram preview will appear here only when Katie or Trinitie sends one."
              : "There is no missing assignment hiding behind an empty queue. New work will appear here when it is ready."}
          </Text>
        </View>
      ) : null}
      {person === "Trinitie"
        ? posts
            .filter(
              (post) =>
                post.targetDate === localDateKey() && post.status !== "Posted",
            )
            .map((post) => (
              <Pressable
                key={post.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${post.title} in Instagram Studio`}
                onPress={() => onOpenInstagramPost(post.id)}
                style={styles.preparedPost}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.preparedPostStatus}>
                    {post.status === "Ready" ? "POST READY" : "CLOUD DRAFT"}
                  </Text>
                  <Text style={styles.preparedPostTitle}>{post.title}</Text>
                  <Text style={styles.preparedPostMeta}>
                    {post.theme} · Opens in Instagram Studio
                  </Text>
                </View>
                <Text style={styles.journalArrow}>›</Text>
              </Pressable>
            ))
        : null}
      {person === "Katie"
        ? needsKatie.map((post) => (
            <Pressable
              key={post.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${post.title} in Instagram Studio`}
              onPress={() => onOpenInstagramPost(post.id)}
              style={styles.preparedPost}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.preparedPostStatus}>NEEDS KATIE</Text>
                <Text style={styles.preparedPostTitle}>{post.title}</Text>
                <Text style={styles.preparedPostMeta}>
                  {post.handoffNote || "Trinitie handed you today’s Instagram post."}
                </Text>
              </View>
              <Text style={styles.journalArrow}>›</Text>
            </Pressable>
          ))
        : null}
      {person === "Mom"
        ? reviewStories.map((story) => (
            <Pressable key={story.slug} onPress={() => onOpenJournalStory(story.slug)} style={styles.preparedPost}>
              <View style={{ flex: 1 }}>
                <Text style={styles.preparedPostStatus}>READY TO REVIEW</Text>
                <Text style={styles.preparedPostTitle}>{story.title}</Text>
                <Text style={styles.preparedPostMeta}>Trail Journal · Tap to read and leave passage notes</Text>
              </View>
              <Text style={styles.journalArrow}>›</Text>
            </Pressable>
          ))
        : null}
      {person === "Mom" && posts.some((post) => post.sharedWithMom) ? (
        <Text style={styles.listTitle}>Shared by Trinitie</Text>
      ) : null}
      {person === "Mom"
        ? posts.filter((post) => post.sharedWithMom).map((post) => (
            <View key={post.id} style={styles.previewShareCard}>
              <Text style={styles.previewPlatform}>INSTAGRAM PREVIEW</Text>
              <Text style={styles.previewShareTitle}>{post.title}</Text>
              <Text style={styles.previewCaption}>{post.caption || "Caption still in progress."}</Text>
              <Text style={styles.previewCreator}>Shared by Trinitie</Text>
            </View>
          ))
        : null}
      {mine.map((seed) => (
        <SeedCard key={seed.id} seed={seed} />
      ))}
      {person !== "Trinitie" ? (
        <Text style={styles.gentleNote}>
          {person === "Mom"
            ? "Review notes won’t change the draft or publish anything."
            : "No overdue alarms. If a queue is empty, the app will simply show where help may be useful."}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function SharedPreviews({
  token,
  person,
  onClose,
  onOpenInstagramPost,
  onOpenJournalStory,
}: {
  token: string;
  person: Person;
  onClose: () => void;
  onOpenInstagramPost: (postId: string) => void;
  onOpenJournalStory: (slug: string) => void;
}) {
  const [visible, setVisible] = useState<
    Array<SharedPreview & { sourceId: string }>
  >([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const instagram =
      person === "Mom"
        ? Promise.resolve({ posts: [] as InstagramPostDraft[] })
        : loadInstagramStudio(token);
    Promise.all([instagram, loadStories(token)])
      .then(([instagramData, journalData]) => {
        const instagramPreviews = instagramData.posts
          .filter((post) => post.status !== "Posted")
          .map((post) => {
            const first = post.mediaUrls[0] || "";
            const imageUrl = first.startsWith("working:")
              ? workingImageUrl(first.slice(8))
              : first.startsWith("http")
                ? first
                : `${API_URL}/apple-touch-icon.png`;
            return {
              id: `instagram-${post.id}`,
              sourceId: post.id,
              title: post.title,
              platform: "Instagram" as const,
              creator: post.assignedTo as Person,
              sharedWith: [post.assignedTo === "Katie" ? "Trinitie" : "Katie"] as Person[],
              version: 1,
              updatedAt: new Date(post.updatedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              imageUrl,
              caption: post.caption || "Caption still in progress.",
              details: [
                post.status,
                post.theme || "Instagram",
                post.targetDate || "No target date",
              ],
            };
          });
        const journalPreviews = journalData.stories
          .filter((story) => story.status !== "Published")
          .map((story) => ({
            id: `journal-${story.slug}`,
            sourceId: story.slug,
            title: story.title,
            platform: "Trail Journal" as const,
            creator: "Katie" as Person,
            sharedWith: ["Trinitie", "Mom"] as Person[],
            version: 1,
            updatedAt: new Date(story.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            imageUrl: story.image
              ? story.image.startsWith("http")
                ? story.image
                : `${API_URL}${story.image}`
              : `${API_URL}/apple-touch-icon.png`,
            caption: story.description || "Story still in progress.",
            details: [story.status, story.category || "Trail Journal"],
          }));
        setVisible([...instagramPreviews, ...journalPreviews]);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Shared previews could not synchronize.",
        ),
      )
      .finally(() => setLoading(false));
  }, [person, token]);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable onPress={onClose} style={styles.backButton}>
        <Text style={styles.backText}>‹ Today</Text>
      </Pressable>
      <Text style={styles.eyebrow}>SHARED PREVIEWS</Text>
      <Text style={styles.pageTitle}>
        {person === "Trinitie"
          ? "A look before it goes out."
          : person === "Mom"
            ? "Ready for your eyes."
            : "See what everyone is making."}
      </Text>
      <Text style={styles.copy}>
        Feedback is optional and attached to the exact version shown. Sharing
        never changes who is creating the post.
      </Text>
      {loading ? <ActivityIndicator color={colors.terracotta} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && !visible.length ? (
        <View style={styles.teamEmpty}>
          <Text style={styles.teamEmptyTitle}>Nothing is waiting here.</Text>
          <Text style={styles.teamEmptyCopy}>
            Real unpublished Journal and Instagram previews will gather here.
          </Text>
        </View>
      ) : null}
      {visible.map((preview) => (
        <View key={preview.id} style={styles.previewShareCard}>
          <View style={styles.previewShareTop}>
            <View>
              <Text style={styles.previewPlatform}>{preview.platform}</Text>
              <Text style={styles.previewVersion}>
                Version {preview.version} · {preview.updatedAt}
              </Text>
            </View>
            <Text style={styles.previewCreator}>by {preview.creator}</Text>
          </View>
          <Image
            source={{
              uri: preview.imageUrl,
              headers: { Authorization: `Bearer ${token}` },
            }}
            style={styles.previewShareImage}
          />
          <Text style={styles.previewShareTitle}>{preview.title}</Text>
          <Text style={styles.previewCaption}>{preview.caption}</Text>
          <View style={styles.previewDetails}>
            {preview.details.map((detail) => (
              <Text key={detail} style={styles.previewDetail}>
                {detail}
              </Text>
            ))}
          </View>
          <Pressable
            onPress={() =>
              preview.platform === "Instagram"
                ? onOpenInstagramPost(preview.sourceId)
                : onOpenJournalStory(preview.sourceId)
            }
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Open the real draft</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function NewAdventure({
  token,
  onSaved,
  onCancel,
}: {
  token: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(""),
    [note, setNote] = useState(""),
    [location, setLocation] = useState(""),
    [files, setFiles] = useState<ImagePicker.ImagePickerAsset[]>([]),
    [saving, setSaving] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState(""),
    [adventureId, setAdventureId] = useState(""),
    [uploadedUris, setUploadedUris] = useState<string[]>([]);
  async function choosePhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 1,
      orderedSelection: true,
    });
    if (!result.canceled)
      setFiles((current) =>
        [...current, ...result.assets].filter(
          (item, index, all) =>
            all.findIndex((candidate) => candidate.uri === item.uri) === index,
        ),
      );
  }
  async function save() {
    setSaving(true);
    setError("");
    try {
      const currentAdventureId = adventureId || (await createSharedAdventure(token, {
          title,
          notes: note,
          privateLocation: location,
        })).id;
      if (!adventureId) setAdventureId(currentAdventureId);
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        if (uploadedUris.includes(file.uri)) continue;
        const isVideo =
          file.type === "video" || file.mimeType?.startsWith("video/");
        if (isVideo) {
          const info = await FileSystem.getInfoAsync(file.uri);
          const byteSize = file.fileSize || (info.exists ? info.size || 0 : 0);
          await uploadAdventureVideo(
            token,
            currentAdventureId,
            {
              uri: file.uri,
              name: file.fileName || `Cheeto-video-${index + 1}.mov`,
              mimeType: file.mimeType,
              byteSize,
              width: file.width,
              height: file.height,
              durationSeconds: Math.max(0, (file.duration || 0) / 1000),
            },
            (piece, total) =>
              setProgress(
                `Adding video ${index + 1} of ${files.length} · ${Math.min(100, Math.round((piece / Math.max(1, total)) * 100))}%…`,
              ),
          );
        } else {
          setProgress(`Adding photo ${index + 1} of ${files.length}…`);
          await uploadAdventurePhoto(token, currentAdventureId, {
            uri: file.uri,
            name: file.fileName || `Cheeto-photo-${index + 1}.jpg`,
            mimeType: file.mimeType,
            width: file.width,
            height: file.height,
          });
        }
        setUploadedUris((current) => current.includes(file.uri) ? current : [...current, file.uri]);
      }
      setProgress("Shared with the studio.");
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "This adventure could not be saved.",
      );
      setProgress("Your adventure and completed uploads are safe. Try the remaining items when the connection settles.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>ADVENTURE INBOX</Text>
      <Text style={styles.pageTitle}>Capture it while it’s fresh.</Text>
      <Text style={styles.copy}>
        Start with the moment. Photos, videos, voice notes, and platform
        adaptations can be added without overwriting the originals.
      </Text>
      <Text style={styles.controlLabel}>Adventure name</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Desert sunrise with Cheeto"
        placeholderTextColor="#8b8075"
        style={styles.input}
      />
      <Text style={styles.controlLabel}>Quick notes</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What happened? What did Cheeto do?"
        placeholderTextColor="#8b8075"
        style={[styles.input, styles.notesInput]}
        multiline
      />
      <Text style={styles.controlLabel}>Exact location · private</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Never published unless you choose"
        placeholderTextColor="#8b8075"
        style={styles.input}
      />
      <Pressable onPress={choosePhotos} style={styles.uploadWell}>
        <Text style={styles.uploadIcon}>▧</Text>
        <Text style={styles.uploadTitle}>
          {files.length
            ? `${files.length} item${files.length === 1 ? "" : "s"} selected`
            : "Choose photos or videos"}
        </Text>
        <Text style={styles.uploadCopy}>
          Opens your iPhone Photos library, including iCloud Photos. Original
          files only; nothing else in your library is touched. Videos may be up
          to 30 seconds and upload privately in small, reliable pieces.
        </Text>
      </Pressable>
      {files.map((file, index) => (
        <View key={file.uri} style={styles.selectedFile}>
          {file.type === "video" || file.mimeType?.startsWith("video/") ? (
            <View style={styles.selectedVideoIcon}>
              <Text style={styles.selectedVideoIconText}>▶</Text>
            </View>
          ) : (
            <Image
              source={{ uri: file.uri }}
              style={{ width: 38, height: 38, borderRadius: 8 }}
            />
          )}
          <Text numberOfLines={1} style={styles.selectedFileName}>
            {file.fileName || `Cheeto moment ${index + 1}`}
          </Text>
          {uploadedUris.includes(file.uri) ? (
            <Text style={styles.uploadedFile}>✓ Uploaded</Text>
          ) : (
            <Pressable
              onPress={() => setFiles((current) => current.filter((item) => item.uri !== file.uri))}
            >
              <Text style={styles.removeFile}>Remove</Text>
            </Pressable>
          )}
        </View>
      ))}
      {progress ? <Text style={styles.success}>{progress}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        disabled={!title.trim() || saving}
        onPress={save}
        style={[
          styles.primary,
          (!title.trim() || saving) && styles.primaryDisabled,
        ]}
      >
        <Text style={styles.primaryText}>
          {saving ? progress || "Saving…" : adventureId ? "Try remaining uploads" : "Save shared adventure"}
        </Text>
      </Pressable>
      <Pressable onPress={onCancel} style={styles.secondary}>
        <Text style={styles.secondaryText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

function Studio({ seeds }: { seeds: ContentSeed[] }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>CONTENT STUDIO</Text>
      <Text style={styles.pageTitle}>
        One adventure. Its own voice everywhere.
      </Text>
      <Text style={styles.copy}>
        Adapt a seed for Instagram, TikTok, YouTube Shorts, Pinterest, or the
        Trail Journal without changing the original.
      </Text>
      <View style={styles.studioBanner}>
        <Text style={styles.studioBannerTitle}>Cheeto Assistant</Text>
        <Text style={styles.studioBannerCopy}>
          Available when requested for captions, hooks, five relevant Instagram
          hashtags, alt text, and gentle rewrites.
        </Text>
        <Pressable style={styles.assistantButton}>
          <Text style={styles.assistantButtonText}>Ask the assistant</Text>
        </Pressable>
      </View>
      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Content seeds</Text>
        <Text style={styles.listCount}>{seeds.length} available</Text>
      </View>
      {seeds.map((seed) => (
        <SeedCard key={seed.id} seed={seed} />
      ))}
    </ScrollView>
  );
}

function InstagramPostEditor({
  token,
  person,
  rhythm,
  post,
  media,
  onSaved,
  onCancel,
}: {
  token: string;
  person: Person;
  rhythm: InstagramDay[];
  post?: InstagramPostDraft;
  media: SharedMediaAsset[];
  onSaved: (post: InstagramPostDraft) => void;
  onCancel: () => void;
}) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }),
    defaultTheme =
      rhythm.find((item) => item.day === today)?.theme || "Adventures";
  const draftKey = post?.id || "new-post";
  const [title, setTitle] = useState(post?.title || ""),
    [caption, setCaption] = useState(post?.caption || ""),
    [mediaUrls, setMediaUrls] = useState(post?.mediaUrls || []),
    [targetDate, setTargetDate] = useState(post?.targetDate || localDateKey()),
    [theme, setTheme] = useState(post?.theme || defaultTheme),
    [saving, setSaving] = useState(false),
    [addingMedia, setAddingMedia] = useState(""),
    [error, setError] = useState(""),
    [handoffNote, setHandoffNote] = useState(post?.handoffNote || ""),
    [sharedWithMom, setSharedWithMom] = useState(post?.sharedWithMom || false),
    [handoffMessage, setHandoffMessage] = useState(""),
    [welcomeAsset, setWelcomeAsset] = useState<SharedMediaAsset>(),
    [welcomeBlurred, setWelcomeBlurred] = useState(false),
    [assistantBusy, setAssistantBusy] = useState(false),
    [suggestion, setSuggestion] = useState<CheetoSuggestion>(),
    [localSaveState, setLocalSaveState] = useState("Opening local safety copy…");
  const localInstagramLoaded = useRef(false);
  function instagramSnapshot(): LocalInstagramDraft {
    return {
      draftKey,
      savedAt: new Date().toISOString(),
      title,
      caption,
      mediaUrls,
      targetDate,
      theme,
      handoffNote,
      sharedWithMom,
    };
  }
  async function persistInstagramLocal() {
    await FileSystem.writeAsStringAsync(
      localInstagramDraftPath(draftKey),
      JSON.stringify(instagramSnapshot()),
    );
    setLocalSaveState("Saved on this iPhone");
  }
  useEffect(() => {
    let active = true;
    FileSystem.readAsStringAsync(localInstagramDraftPath(draftKey))
      .then((raw) => {
        if (!active || localInstagramLoaded.current) return;
        const saved = JSON.parse(raw) as LocalInstagramDraft;
        if (saved.draftKey !== draftKey) return;
        setTitle(saved.title);
        setCaption(saved.caption);
        setMediaUrls(saved.mediaUrls);
        setTargetDate(saved.targetDate);
        setTheme(saved.theme);
        setHandoffNote(saved.handoffNote);
        setLocalSaveState("Restored from this iPhone");
      })
      .catch(() => setLocalSaveState(post ? "Synchronized" : "New local draft"))
      .finally(() => {
        localInstagramLoaded.current = true;
      });
    return () => {
      active = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (!localInstagramLoaded.current) return;
    const timer = setTimeout(() => {
      persistInstagramLocal().catch(() =>
        setLocalSaveState("Keep this screen open while saving"),
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [title, caption, mediaUrls, targetDate, theme, handoffNote]);
  async function save(
    status: InstagramPostDraft["status"],
    close = true,
    assignedTo: InstagramPostDraft["assignedTo"] = post?.assignedTo || "Trinitie",
  ) {
    setSaving(true);
    setError("");
    try {
      const saved = await saveInstagramPost(token, {
          id: post?.id || "",
          title: title.trim(),
          caption,
          mediaUrls,
          targetDate,
          theme,
          status,
          assignedTo,
          handoffNote,
          sharedWithMom,
        });
      onSaved(saved);
      await FileSystem.deleteAsync(localInstagramDraftPath(draftKey), {
        idempotent: true,
      });
      setLocalSaveState("Synchronized");
      if (close) onCancel();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save this post.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function addMedia(asset: SharedMediaAsset) {
    setAddingMedia(asset.id);
    setError("");
    try {
      const version = await saveWorkingVersion(token, asset.id, "instagram", {
        logoColor: "terracotta",
        logoSize: "small",
        logoSide: "right",
        focus: "center",
      });
      setMediaUrls((current) => [...current, `working:${version.id}`]);
      if (
        asset.width &&
        asset.height &&
        Math.min(asset.width, asset.height) < 1080
      ) {
        setHandoffMessage(
          `Bitch, you blurry—for real this time. This copy is ${asset.width}×${asset.height}; use it intentionally or ask Katie for the higher-quality original.`,
        );
      }
      if (
        person === "Trinitie" &&
        (await SecureStore.getItemAsync(TRINITIE_WELCOME_KEY)) !== "shown"
      ) {
        await SecureStore.setItemAsync(TRINITIE_WELCOME_KEY, "shown");
        setWelcomeAsset(asset);
        setWelcomeBlurred(true);
        setTimeout(() => setWelcomeBlurred(false), 1200);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "That photo could not be prepared.",
      );
    } finally {
      setAddingMedia("");
    }
  }
  async function handoff() {
    const ids = mediaUrls
      .filter((item) => item.startsWith("working:"))
      .map((item) => item.slice(8));
    if (!ids.length || !FileSystem.cacheDirectory) {
      setError("Add at least one finished image before handoff.");
      return;
    }
    setHandoffMessage("Preparing Instagram handoff…");
    try {
      await Clipboard.setStringAsync(caption);
      const permission = await ExpoMediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        throw new Error(
          "Allow Photos access so the finished images can be saved for Instagram.",
        );
      }
      const downloads: string[] = [];
      for (const [index, id] of ids.entries()) {
        const target = `${FileSystem.cacheDirectory}${targetDate || localDateKey()}-${exportStem(title, "cheeto-instagram")}-${index + 1}.jpg`;
        const download = await FileSystem.downloadAsync(
          workingImageUrl(id),
          target,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        downloads.push(download.uri);
        await ExpoMediaLibrary.saveToLibraryAsync(download.uri);
      }
      const canOpenInstagram = await Linking.canOpenURL("instagram://library");
      if (canOpenInstagram) {
        await Linking.openURL("instagram://library");
      } else {
        await Sharing.shareAsync(downloads[0]!, {
          mimeType: "image/jpeg",
          UTI: "public.jpeg",
          dialogTitle: "Upload to Instagram",
        });
      }
      await save("Handed Off", false);
      setHandoffMessage(
        `${ids.length} finished ${ids.length === 1 ? "image" : "images"} saved to Photos in order and the caption is copied. Return here to mark it Posted after Instagram finishes.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Instagram handoff could not open.",
      );
    }
  }
  async function handToKatie() {
    setSaving(true);
    setError("");
    try {
      const saved = await saveInstagramPost(token, {
        id: post?.id || "",
        title: title.trim(),
        caption,
        mediaUrls,
        targetDate,
        theme,
        status: post?.status || "Draft",
        assignedTo: "Katie",
        handoffNote,
        sharedWithMom,
      });
      onSaved(saved);
      await FileSystem.deleteAsync(localInstagramDraftPath(draftKey), {
        idempotent: true,
      });
      onCancel();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This post could not be handed to Katie.");
    } finally {
      setSaving(false);
    }
  }
  async function askAssistant() {
    setAssistantBusy(true);
    setError("");
    try {
      const result = await askCheetoAssistant(token, {
        title,
        theme,
        notes: caption,
      });
      setSuggestion(result.suggestion);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The Cheeto Assistant is resting right now.",
      );
    } finally {
      setAssistantBusy(false);
    }
  }
  return (
    <View style={styles.instagramDraftEditor}>
      <Text style={styles.eyebrow}>CLOUD POST DRAFT</Text>
      <Text style={styles.pageTitle}>
        {post ? "Keep shaping it." : "Prepare a post."}
      </Text>
      <Text style={styles.localSaveState}>{localSaveState}</Text>
      <Text style={styles.controlLabel}>Working title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="Sunday window supervisor"
        placeholderTextColor="#8b8075"
      />
      <Pressable
        disabled={assistantBusy || (!title.trim() && !caption.trim())}
        onPress={askAssistant}
        style={styles.assistantInlineButton}
      >
        <Text style={styles.assistantInlineButtonText}>
          {assistantBusy ? "Cheeto is considering it…" : "Ask Cheeto Assistant"}
        </Text>
      </Pressable>
      {suggestion ? (
        <View style={styles.assistantSuggestion}>
          <Text style={styles.assistantSuggestionLabel}>EDITABLE SUGGESTION</Text>
          <Text style={styles.assistantSuggestionCaption}>{suggestion.caption}</Text>
          {suggestion.hashtags.map((item) => (
            <View key={item.tag} style={styles.assistantHashtagRow}>
              <Text style={styles.assistantHashtag}>{item.tag}</Text>
              <Text style={styles.assistantHashtagReason}>{item.reason}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => {
              setCaption(
                `${suggestion.caption.trim()}\n\n${suggestion.hashtags.map((item) => item.tag).join(" ")}`,
              );
              setSuggestion(undefined);
            }}
            style={styles.assistantUseButton}
          >
            <Text style={styles.assistantUseButtonText}>Use and keep editing</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.controlLabel}>Caption · Cheeto’s voice</Text>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        style={[styles.input, styles.notesInput]}
        multiline
        placeholder="What does Cheeto have to say?"
        placeholderTextColor="#8b8075"
      />
      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Photos from Katie</Text>
        <Text style={styles.listCount}>{media.length} available</Text>
      </View>
      <Text style={styles.helperCopy}>
        Tap a photo to make an Instagram-ready working copy. Katie’s original
        always stays untouched.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.instagramMediaRow}
      >
        {media.map((asset) => (
          <Pressable
            key={asset.id}
            onPress={() => addMedia(asset)}
            disabled={addingMedia === asset.id}
            style={styles.instagramMediaCard}
          >
            <Image
              source={{
                uri: privateMediaUrl(asset.id),
                headers: { Authorization: `Bearer ${token}` },
              }}
              style={styles.instagramMediaThumb}
            />
            <Text numberOfLines={2} style={styles.instagramMediaName}>
              {asset.original_name}
            </Text>
            {asset.width && asset.height ? (
              <Text style={styles.instagramMediaDimensions}>
                {asset.width}×{asset.height}
              </Text>
            ) : null}
            <Text style={styles.instagramMediaAdd}>
              {addingMedia === asset.id ? "Preparing…" : "Use photo"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {mediaUrls.length ? (
        <>
          <Text style={styles.controlLabel}>Selected for this post</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.instagramMediaRow}
          >
            {mediaUrls.map((item, index) => {
              const id = item.startsWith("working:") ? item.slice(8) : "";
              return (
                <View key={`${item}-${index}`} style={styles.instagramSelectedCard}>
                  {id ? (
                    <Image
                      source={{
                        uri: workingImageUrl(id),
                        headers: { Authorization: `Bearer ${token}` },
                      }}
                      style={styles.instagramSelectedThumb}
                    />
                  ) : null}
                  <Text style={styles.instagramSelectedNumber}>{index + 1}</Text>
                  <Pressable
                    onPress={() =>
                      setMediaUrls((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Text style={styles.instagramRemove}>Remove</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : null}
      <Text style={styles.controlLabel}>Target date</Text>
      <TextInput
        value={targetDate}
        onChangeText={setTargetDate}
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#8b8075"
      />
      <Text style={styles.controlLabel}>Daily theme</Text>
      <TextInput value={theme} onChangeText={setTheme} style={styles.input} />
      <Text style={styles.controlLabel}>Optional note if Katie takes this one</Text>
      <TextInput
        value={handoffNote}
        onChangeText={setHandoffNote}
        maxLength={300}
        multiline
        style={[styles.input, styles.notesInput]}
        placeholder="Busy today, caption needs help, or anything useful"
        placeholderTextColor="#8b8075"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {handoffMessage ? (
        <Text style={styles.successText}>{handoffMessage}</Text>
      ) : null}
      <Pressable
        disabled={saving || !title.trim()}
        onPress={() => save("Ready")}
        style={[styles.primary, !title.trim() && styles.primaryDisabled]}
      >
        <Text style={styles.primaryText}>
          {saving
            ? "Saving…"
            : post?.status === "Handed Off"
              ? "Posting didn’t work · return to Ready"
              : "Save as post ready"}
        </Text>
      </Pressable>
      {post?.assignedTo !== "Katie" ? (
        <Pressable
          disabled={saving || !title.trim()}
          onPress={handToKatie}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Ask Katie to take this one</Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={saving || !title.trim()}
          onPress={() => save(post.status, true, "Trinitie")}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Return to Trinitie</Text>
        </Pressable>
      )}
      <Pressable
        disabled={saving || !title.trim()}
        onPress={async () => {
          const nextSharedWithMom = !sharedWithMom;
          setSaving(true);
          setError("");
          try {
            const saved = await saveInstagramPost(token, {
              id: post?.id || "",
              title: title.trim(), caption, mediaUrls, targetDate, theme,
              status: post?.status || "Draft",
              assignedTo: post?.assignedTo || "Trinitie",
              handoffNote, sharedWithMom: nextSharedWithMom,
            });
            setSharedWithMom(nextSharedWithMom);
            onSaved(saved);
            setHandoffMessage(nextSharedWithMom ? "Shared with CatNana’s Today screen." : "Removed from CatNana’s Today screen.");
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "This preview could not be shared.");
          } finally {
            setSaving(false);
          }
        }}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>{sharedWithMom ? "Stop sharing with CatNana" : "Share preview with CatNana"}</Text>
      </Pressable>
      {mediaUrls.length ? (
        <Pressable onPress={handoff} style={styles.instagramHandoffButton}>
          <Text style={styles.instagramHandoffButtonText}>
            Copy caption &amp; upload to Instagram
          </Text>
        </Pressable>
      ) : null}
      {post?.status === "Handed Off" ? (
        <Pressable
          disabled={saving}
          onPress={() => save("Posted")}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Mark as posted</Text>
        </Pressable>
      ) : null}
      <Pressable
        disabled={saving || !title.trim()}
        onPress={() => save("Draft")}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>Save cloud draft</Text>
      </Pressable>
      <Pressable onPress={() => persistInstagramLocal().finally(onCancel)}>
        <Text style={styles.laterText}>Cancel</Text>
      </Pressable>
      <Modal visible={Boolean(welcomeAsset)} transparent animationType="fade">
        <View style={styles.studioWelcomeBackdrop}>
          <View style={styles.studioWelcomeCard}>
            {welcomeAsset ? (
              <Image
                source={{
                  uri: privateMediaUrl(welcomeAsset.id),
                  headers: { Authorization: `Bearer ${token}` },
                }}
                blurRadius={welcomeBlurred ? 24 : 0}
                style={styles.studioWelcomeImage}
              />
            ) : null}
            <Text style={styles.studioWelcomeTitle}>
              {welcomeBlurred ? "Bitch, you blurry." : "Just kidding."}
            </Text>
            <Text style={styles.studioWelcomeCopy}>
              {welcomeBlurred
                ? "One tiny moment…"
                : "Original quality preserved. Welcome to your studio, Trinitie. 💛"}
            </Text>
            {!welcomeBlurred ? (
              <Pressable
                onPress={() => setWelcomeAsset(undefined)}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>I love it</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InstagramStudio({
  token,
  person,
  seeds,
  onOpenPreviews,
  initialArticle,
  onInitialArticleOpened,
  initialPostId,
  onInitialPostOpened,
}: {
  token: string;
  person: Person;
  seeds: ContentSeed[];
  onOpenPreviews: () => void;
  initialArticle?: JournalAdaptation;
  onInitialArticleOpened: () => void;
  initialPostId?: string;
  onInitialPostOpened: () => void;
}) {
  const [rhythm, setRhythm] = useState<InstagramDay[]>(initialInstagramRhythm),
    [templates, setTemplates] = useState<InstagramTemplate[]>(
      starterInstagramTemplates,
    ),
    [posts, setPosts] = useState<InstagramPostDraft[]>([]),
    [studioMedia, setStudioMedia] = useState<SharedMediaAsset[]>([]),
    [editingPost, setEditingPost] = useState<
      InstagramPostDraft | null | undefined
    >(undefined),
    [editingRhythm, setEditingRhythm] = useState(false),
    [importMessage, setImportMessage] = useState(""),
    [saveMessage, setSaveMessage] = useState(""),
    [savingRhythm, setSavingRhythm] = useState(false),
    [reminderEnabled, setReminderEnabled] = useState(false),
    [reminderTime, setReminderTime] = useState("17:30");
  const initialArticleOpened = useRef(false);
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const today = rhythm.find((item) => item.day === weekday);
  useEffect(() => {
    Promise.all([
      loadInstagramStudio(token),
      loadSharedMedia(token),
      SecureStore.getItemAsync(INSTAGRAM_REMINDER_SETTING),
      SecureStore.getItemAsync(INSTAGRAM_REMINDER_TIME),
    ])
      .then(([data, mediaData, reminderSetting, savedReminderTime]) => {
        if (data.rhythm) setRhythm(data.rhythm);
        setTemplates(data.templates);
        setPosts(data.posts);
        setStudioMedia(mediaData.media);
        const enabled = reminderSetting === "on";
        const time = savedReminderTime || "17:30";
        setReminderEnabled(enabled);
        setReminderTime(time);
        syncInstagramReminder(
          data.posts,
          enabled,
          time,
          data.rhythm || initialInstagramRhythm,
        ).catch(() => {});
      })
      .catch(() =>
        setSaveMessage(
          "Using the saved default rhythm until Studio synchronization is available.",
        ),
      );
  }, [token]);
  useEffect(() => {
    if (
      !initialArticle ||
      initialArticle.platform !== "Instagram" ||
      initialArticleOpened.current
    )
      return;
    initialArticleOpened.current = true;
    const targetDate = Number.isNaN(Date.parse(initialArticle.publishDate))
      ? localDateKey()
      : initialArticle.publishDate.slice(0, 10);
    const sourceNote = `Adapted from Trail Journal · /trail-journal/${initialArticle.slug}/`;
    const draft: InstagramPostDraft = {
      id: "",
      title: initialArticle.title,
      caption: initialArticle.description,
      mediaUrls: [],
      targetDate,
      theme: "Trail Journal",
      status: "Draft",
      assignedTo: "Trinitie",
      handoffNote: sourceNote,
      sharedWithMom: false,
      updatedAt: new Date().toISOString(),
    };
    setEditingPost(draft);
    onInitialArticleOpened();
    askCheetoAssistant(token, {
      title: initialArticle.title,
      theme: "Trail Journal",
      notes: initialArticle.description,
    })
      .then(({ suggestion }) =>
        setEditingPost((current) =>
          current?.id === ""
            ? {
                ...current,
                caption: `${suggestion.caption.trim()}\n\n${suggestion.hashtags
                  .slice(0, 5)
                  .map((item) => item.tag)
                  .join(" ")}`,
              }
            : current,
        ),
      )
      .catch(() => {});
  }, [initialArticle, onInitialArticleOpened, token]);
  useEffect(() => {
    if (!initialPostId || !posts.length) return;
    const post = posts.find((item) => item.id === initialPostId);
    if (!post) return;
    setEditingPost(post);
    onInitialPostOpened();
  }, [initialPostId, onInitialPostOpened, posts]);
  function updateTheme(index: number, theme: string) {
    setRhythm((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, theme } : item,
      ),
    );
  }
  function toggleDay(index: number) {
    setRhythm((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  }
  async function finishRhythm() {
    if (!editingRhythm) {
      setEditingRhythm(true);
      setSaveMessage("");
      return;
    }
    setSavingRhythm(true);
    try {
      await saveInstagramRhythm(token, rhythm);
      await syncInstagramReminder(
        posts,
        reminderEnabled,
        reminderTime,
        rhythm,
      );
      setEditingRhythm(false);
      setSaveMessage("Weekly rhythm saved.");
    } catch (reason) {
      setSaveMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to save the weekly rhythm.",
      );
    } finally {
      setSavingRhythm(false);
    }
  }
  async function addFavoriteTemplate() {
    setImportMessage("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0]!;
      setImportMessage("Saving your original template…");
      const saved = await uploadInstagramTemplate(token, {
        uri: asset.uri,
        name: asset.fileName || "Instagram-template.png",
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
      });
      setTemplates((current) => [saved, ...current]);
      setImportMessage("Template saved to your private Studio library.");
    } catch (reason) {
      setImportMessage(
        reason instanceof Error ? reason.message : "That template could not be saved.",
      );
    }
  }
  async function toggleReminder() {
    const next = !reminderEnabled;
    setReminderEnabled(next);
    await SecureStore.setItemAsync(INSTAGRAM_REMINDER_SETTING, next ? "on" : "off");
    await syncInstagramReminder(posts, next, reminderTime, rhythm);
    setSaveMessage(
      next
        ? `One gentle ${reminderLabel(reminderTime)} reminder is on when today has nothing ready.`
        : "Instagram reminders are off.",
    );
  }
  async function chooseReminderTime(time: string) {
    setReminderTime(time);
    await SecureStore.setItemAsync(INSTAGRAM_REMINDER_TIME, time);
    await syncInstagramReminder(posts, reminderEnabled, time, rhythm);
    setSaveMessage(
      `Gentle reminder moved to ${reminderLabel(time)}. Disabled rhythm days stay quiet.`,
    );
  }
  function acceptSavedPost(saved: InstagramPostDraft) {
    const next = [saved, ...posts.filter((item) => item.id !== saved.id)];
    setPosts(next);
    syncInstagramReminder(next, reminderEnabled, reminderTime, rhythm).catch(
      () => {},
    );
  }
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>INSTAGRAM STUDIO</Text>
      <Text style={styles.pageTitle}>
        {today?.enabled ? today.theme : "Today can be simple."}
      </Text>
      <Text style={styles.copy}>
        Cheeto moments already uploaded by Katie are ready to become posts,
        carousels, Stories, or Reels.
      </Text>
      <View style={styles.instagramReady}>
        <View>
          <Text style={styles.instagramReadyNumber}>
            {
              seeds.filter((seed) => seed.platforms.includes("Instagram"))
                .length
            }
          </Text>
          <Text style={styles.instagramReadyLabel}>
            available content seeds
          </Text>
        </View>
        <Pressable
          onPress={onOpenPreviews}
          style={styles.instagramPreviewButton}
        >
          <Text style={styles.instagramPreviewButtonText}>Shared previews</Text>
        </Pressable>
      </View>
      {editingPost !== undefined ? (
        <InstagramPostEditor
          token={token}
          person={person}
          rhythm={rhythm}
          post={editingPost || undefined}
          media={studioMedia}
          onCancel={() => setEditingPost(undefined)}
          onSaved={acceptSavedPost}
        />
      ) : (
        <>
          <View style={styles.listHeading}>
            <Text style={styles.listTitle}>Prepared posts</Text>
            <Pressable onPress={() => setEditingPost(null)}>
              <Text style={styles.editLink}>New post</Text>
            </Pressable>
          </View>
          {posts.length ? (
            posts.map((post) => (
              <Pressable
                key={post.id}
                onPress={() => setEditingPost(post)}
                style={styles.preparedPost}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.preparedPostStatus}>
                    {post.status === "Ready"
                      ? "POST READY"
                      : post.status.toUpperCase()}
                  </Text>
                  <Text style={styles.preparedPostTitle}>{post.title}</Text>
                  <Text style={styles.preparedPostMeta}>
                    {post.targetDate || "No target date"} · {post.theme}
                  </Text>
                </View>
                <Text style={styles.journalArrow}>›</Text>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyPostsTitle}>Nothing prepared yet.</Text>
              <Text style={styles.emptyPostsCopy}>
                Save a cloud draft now and choose any future target day. It will
                not post automatically.
              </Text>
            </View>
          )}
        </>
      )}
      {templates.length && importMessage ? (
        <Text style={styles.importMessage}>{importMessage}</Text>
      ) : null}
      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Your templates</Text>
        <Pressable
          onPress={addFavoriteTemplate}
        >
          <Text style={styles.editLink}>Add favorites</Text>
        </Pressable>
      </View>
      {templates.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateLibraryRow}>
          {templates.map((template) => (
            <View key={template.id} style={styles.templateLibraryCard}>
              <Image
                source={{
                  uri: template.previewUrl
                    ? template.previewUrl.startsWith("http")
                      ? template.previewUrl
                      : `${API_URL}${template.previewUrl}`
                    : `${API_URL}/images/pinterest-logos/logo-terracotta.png`,
                  headers: { Authorization: `Bearer ${token}` },
                }}
                resizeMode="contain"
                style={styles.templateLibraryImage}
              />
              <Text numberOfLines={2} style={styles.templateLibraryName}>{template.name}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.templateWelcome}>
          <Text style={styles.templateWelcomeTitle}>
            Make this feel like your studio.
          </Text>
          <Text style={styles.templateWelcomeCopy}>
            Bring in the PNG templates, frames, and graphics you already love.
            We’ll preserve the originals and keep them ready for future posts.
          </Text>
          <Pressable
            onPress={addFavoriteTemplate}
            style={styles.templateButton}
          >
            <Text style={styles.templateButtonText}>Add my favorites</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.laterText}>I’ll do this later</Text>
          </Pressable>
          {importMessage ? (
            <Text style={styles.importMessage}>{importMessage}</Text>
          ) : null}
        </View>
      )}
      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Weekly rhythm</Text>
        <Pressable disabled={savingRhythm} onPress={finishRhythm}>
          <Text style={styles.editLink}>
            {savingRhythm ? "Saving…" : editingRhythm ? "Save" : "Edit"}
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={toggleReminder} style={styles.reminderSetting}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reminderSettingTitle}>
            Gentle {reminderLabel(reminderTime)} reminder
          </Text>
          <Text style={styles.reminderSettingCopy}>
            Only when today still has no Ready, Handed Off, or Posted Instagram post.
          </Text>
        </View>
        <Text style={styles.reminderSettingState}>{reminderEnabled ? "On" : "Off"}</Text>
      </Pressable>
      {reminderEnabled ? (
        <View style={styles.reminderTimeChoices}>
          <Text style={styles.controlLabel}>Reminder time</Text>
          <View style={styles.choiceRow}>
            {["16:30", "17:30", "18:30"].map((time) => (
              <Choice
                key={time}
                value={time}
                label={reminderLabel(time)}
                current={reminderTime}
                onPress={chooseReminderTime}
              />
            ))}
          </View>
          <Text style={styles.helperCopy}>
            Days turned off in the weekly rhythm never receive this reminder.
          </Text>
        </View>
      ) : null}
      <View style={styles.rhythmCard}>
        {rhythm.map((item, index) => (
          <View
            key={item.day}
            style={[
              styles.rhythmRow,
              !item.enabled && styles.rhythmRowDisabled,
            ]}
          >
            <Text style={styles.rhythmDay}>{item.day.slice(0, 3)}</Text>
            {editingRhythm ? (
              <TextInput
                value={item.theme}
                onChangeText={(value) => updateTheme(index, value)}
                style={styles.rhythmInput}
              />
            ) : (
              <Text style={styles.rhythmTheme}>{item.theme}</Text>
            )}
            {editingRhythm ? (
              <Pressable
                onPress={() => toggleDay(index)}
                style={[
                  styles.rhythmToggle,
                  item.enabled && styles.rhythmToggleOn,
                ]}
              >
                <Text
                  style={[
                    styles.rhythmToggleText,
                    item.enabled && styles.rhythmToggleTextOn,
                  ]}
                >
                  {item.enabled ? "On" : "Off"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
      {saveMessage ? (
        <Text style={styles.syncMessage}>{saveMessage}</Text>
      ) : null}
      <View style={styles.hashtagRule}>
        <Text style={styles.hashtagTitle}>Five hashtags. All relevant.</Text>
        <Text style={styles.hashtagCopy}>
          The Cheeto Assistant can suggest exactly five and briefly explain why
          each one fits before it is used.
        </Text>
      </View>
      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Available from Katie</Text>
        <Text style={styles.listCount}>{seeds.length} seeds</Text>
      </View>
      {seeds.map((seed) => (
        <SeedCard key={seed.id} seed={seed} />
      ))}
    </ScrollView>
  );
}

function VideoStudio({
  token,
  person,
  media,
  initialArticle,
  onInitialArticleOpened,
}: {
  token: string;
  person: Person;
  media: SharedMediaAsset[];
  initialArticle?: JournalAdaptation;
  onInitialArticleOpened: () => void;
}) {
  const palette = [
    { name: "White", value: "#ffffff" },
    { name: "Bark", value: colors.bark },
    { name: "Sand", value: colors.sand },
    { name: "Terracotta", value: colors.terracotta },
    { name: "Sage", value: colors.sageDeep },
    { name: "Black", value: "#111111" },
  ];
  const firstPreset = videoOverlayPresets[0]!;
  const [presetId, setPresetId] = useState(firstPreset.id),
    [fontId, setFontId] = useState(videoFonts[0]!.id),
    [text, setText] = useState(firstPreset.defaultText);
  const [textColor, setTextColor] = useState(firstPreset.defaultColor),
    [accentColor, setAccentColor] = useState(firstPreset.defaultAccent);
  const [startAt, setStartAt] = useState("1"),
    [endAt, setEndAt] = useState("6"),
    [message, setMessage] = useState("");
  const [projects, setProjects] = useState<VideoProject[]>([]),
    [activeProjectId, setActiveProjectId] = useState<string>(),
    [projectTitle, setProjectTitle] = useState(""),
    [projectStatus, setProjectStatus] = useState<VideoProject["status"]>("Draft"),
    [assignedTo, setAssignedTo] = useState<VideoProject["assignedTo"]>(
      person === "Trinitie" ? "Trinitie" : "Katie",
    ),
    [platforms, setPlatforms] = useState<VideoProject["platforms"]>([
      "Instagram Reels",
    ]),
    [sourceStorySlug, setSourceStorySlug] = useState(""),
    [selectedMediaId, setSelectedMediaId] = useState<string | null>(null),
    [savingProject, setSavingProject] = useState(false);
  const [previewText, setPreviewText] = useState(firstPreset.defaultText),
    [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false),
    [renderProgress, setRenderProgress] = useState(0),
    [renderStage, setRenderStage] = useState(""),
    [finishedVideo, setFinishedVideo] = useState<string>();
  const [clip, setClip] = useState<{ uri: string; name: string }>(),
    [clipMessage, setClipMessage] = useState(
      "From iPhone Photos · the original stays untouched",
    );
  const player = useVideoPlayer(null);
  const previewMotion = useRef(new Animated.Value(1)).current,
    playbackTimers = useRef<number[]>([]);
  const initialArticleOpened = useRef(false);
  const [timeline, setTimeline] = useState<VideoOverlayDraft[]>([]);
  const preset =
    videoOverlayPresets.find((item) => item.id === presetId) || firstPreset;
  const font = videoFonts.find((item) => item.id === fontId) || videoFonts[0]!;
  const sharedVideos = media.filter(
    (item) => item.kind === "video" || item.content_type.startsWith("video/"),
  );
  useEffect(() => {
    loadVideoProjects(token)
      .then((data) => setProjects(data.projects))
      .catch((reason) =>
        setMessage(
          reason instanceof Error
            ? reason.message
            : "Shared video projects could not be opened.",
        ),
      );
  }, [token]);
  useEffect(() => {
    if (clip?.uri) player.replace(clip.uri);
  }, [clip?.uri, player]);
  useEffect(() => {
    if (
      !initialArticle ||
      !["TikTok", "YouTube Shorts"].includes(initialArticle.platform) ||
      initialArticleOpened.current
    )
      return;
    initialArticleOpened.current = true;
    setText(initialArticle.title);
    setPreviewText(initialArticle.title);
    setProjectTitle(initialArticle.title);
    setSourceStorySlug(initialArticle.slug);
    setPlatforms(
      initialArticle.platform === "TikTok" ? ["TikTok"] : ["YouTube Shorts"],
    );
    setMessage(
      `${initialArticle.platform} adaptation opened from “${initialArticle.title}.” Add the right clip, then shape its own hook and overlays here.`,
    );
    onInitialArticleOpened();
  }, [initialArticle, onInitialArticleOpened]);
  async function chooseClip() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const name = asset.fileName || "Cheeto video";
    setClip({ uri: asset.uri, name });
    setSelectedMediaId(null);
    setClipMessage(`${name} · selected from iPhone Photos`);
    setMessage("");
  }
  async function chooseSharedClip(asset: SharedMediaAsset) {
    setMessage("Opening the shared original…");
    try {
      const extension = asset.original_name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ||
        (asset.content_type.includes("quicktime") ? ".mov" : ".mp4");
      const base = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!base) throw new Error("This iPhone did not provide temporary storage.");
      const local = `${base}shared-video-${asset.id}${extension}`;
      const downloaded = await FileSystem.downloadAsync(
        privateMediaUrl(asset.id),
        local,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setClip({ uri: downloaded.uri, name: asset.original_name });
      setSelectedMediaId(asset.id);
      setClipMessage(`${asset.original_name} · from the shared Media Library`);
      setMessage("");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "That shared video could not be opened.",
      );
    }
  }
  function toggleVideoPlatform(platform: VideoProject["platforms"][number]) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }
  function newProject() {
    stopPreview();
    setActiveProjectId(undefined);
    setProjectTitle("");
    setProjectStatus("Draft");
    setAssignedTo(person === "Trinitie" ? "Trinitie" : "Katie");
    setPlatforms(["Instagram Reels"]);
    setSourceStorySlug("");
    setSelectedMediaId(null);
    setClip(undefined);
    setClipMessage("From iPhone Photos · the original stays untouched");
    setTimeline([]);
    setFinishedVideo(undefined);
    setRenderProgress(0);
    setRenderStage("");
    setMessage("New shared video project ready.");
  }
  async function openProject(project: VideoProject) {
    stopPreview();
    setActiveProjectId(project.id);
    setProjectTitle(project.title);
    setProjectStatus(project.status);
    setAssignedTo(project.assignedTo);
    setPlatforms(project.platforms);
    setSourceStorySlug(project.sourceStorySlug);
    setSelectedMediaId(project.mediaId);
    setTimeline(project.overlays);
    const current = project.currentOverlay;
    if (current?.presetId) setPresetId(current.presetId);
    if (current?.fontId) setFontId(current.fontId);
    if (typeof current?.text === "string") {
      setText(current.text);
      setPreviewText(current.text);
    }
    if (current?.textColor) setTextColor(current.textColor);
    if (current?.accentColor) setAccentColor(current.accentColor);
    if (current?.startAt) setStartAt(current.startAt);
    if (current?.endAt) setEndAt(current.endAt);
    const shared = sharedVideos.find((item) => item.id === project.mediaId);
    if (shared) await chooseSharedClip(shared);
    else if (project.mediaId)
      setClipMessage("The shared original is temporarily unavailable.");
    setMessage(`Opened “${project.title}” · last edited by ${project.lastEditedBy}.`);
  }
  async function saveSharedProject() {
    if (!projectTitle.trim()) {
      setMessage("Give this video project a short title first.");
      return;
    }
    if (!platforms.length) {
      setMessage("Choose at least one destination for this video.");
      return;
    }
    setSavingProject(true);
    try {
      const saved = await saveVideoProject(token, {
        ...(activeProjectId ? { id: activeProjectId } : {}),
        title: projectTitle,
        mediaId: selectedMediaId,
        sourceStorySlug,
        platforms,
        overlays: timeline,
        currentOverlay: {
          presetId,
          fontId,
          text,
          textColor,
          accentColor,
          startAt,
          endAt,
          animation: preset.animation,
        },
        status: projectStatus,
        assignedTo,
      });
      setActiveProjectId(saved.id);
      setProjects((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setMessage(
        `Shared project saved · ${saved.assignedTo} will see the same editable timeline.`,
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "That project could not be saved.",
      );
    } finally {
      setSavingProject(false);
    }
  }
  function choosePreset(id: string) {
    const next =
      videoOverlayPresets.find((item) => item.id === id) || firstPreset;
    stopPreview();
    setPresetId(next.id);
    setText(next.defaultText);
    setPreviewText(next.defaultText);
    setTextColor(next.defaultColor);
    setAccentColor(next.defaultAccent);
    setMessage("");
  }
  function stopPreview() {
    playbackTimers.current.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    playbackTimers.current = [];
    previewMotion.stopAnimation();
    previewMotion.setValue(1);
    setPlaying(false);
    setPreviewText(text || "Your words appear here");
    player.pause();
  }
  function playPreview() {
    if (playing) {
      stopPreview();
      return;
    }
    const source = text || "Your words appear here",
      start = Math.max(0, Number(startAt) || 0),
      end = Math.max(start + 0.5, Number(endAt) || start + 5),
      revealSeconds = Math.max(0.5, end - start);
    setPlaying(true);
    setPreviewText("");
    previewMotion.setValue(0);
    if (clip) {
      player.currentTime = 0;
      player.play();
    }
    playbackTimers.current.push(
      setTimeout(() => {
        if (
          preset.animation === "Typewriter" ||
          preset.animation === "Word by word"
        ) {
          const pieces =
            preset.animation === "Word by word"
              ? source.split(/(\s+)/)
              : [...source];
          let index = 0;
          previewMotion.setValue(1);
          playbackTimers.current.push(
            setInterval(
              () => {
                index += 1;
                setPreviewText(pieces.slice(0, index).join(""));
                if (index >= pieces.length)
                  clearInterval(playbackTimers.current.at(-1));
              },
              Math.max(32, (revealSeconds * 1000) / Math.max(1, pieces.length)),
            ) as unknown as number,
          );
        } else {
          setPreviewText(source);
          const animation =
            preset.animation === "Flicker"
              ? Animated.sequence(
                  [0, 1, 0.2, 1, 0.35, 1].map((value) =>
                    Animated.timing(previewMotion, {
                      toValue: value,
                      duration: 140,
                      useNativeDriver: true,
                    }),
                  ),
                )
              : Animated.timing(previewMotion, {
                  toValue: 1,
                  duration: preset.animation === "Fade" ? 900 : 520,
                  easing: Easing.out(Easing.back(1.4)),
                  useNativeDriver: true,
                });
          animation.start();
        }
      }, start * 1000) as unknown as number,
    );
    playbackTimers.current.push(
      setTimeout(stopPreview, (end + 0.45) * 1000) as unknown as number,
    );
  }
  useEffect(
    () => () =>
      playbackTimers.current.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
      }),
    [],
  );
  function addToTimeline() {
    const start = Math.max(0, Number(startAt) || 0),
      end = Math.max(start + 0.5, Number(endAt) || start + 5);
    setTimeline((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        presetId,
        name: preset.name,
        fontId,
        fontName: font.name,
        fontFamily: font.family,
        text: text.trim() || "Your words appear here",
        textColor,
        accentColor,
        startAt: start,
        endAt: end,
        animation: preset.animation,
        boxed: Boolean(preset.boxed),
        uppercase: Boolean(preset.uppercase),
      },
    ]);
    setMessage(
      "Added to this video. You can add another overlay without changing the original clip.",
    );
  }
  async function createFinishedVideo() {
    if (!clip) {
      setMessage("Choose a video from Photos or the Shared Media Library first.");
      return;
    }
    if (!FileSystem.cacheDirectory) {
      setMessage("This iPhone did not provide temporary space for the finished video.");
      return;
    }
    const layers = timeline.length
      ? timeline
      : [{
          id: "current-overlay",
          presetId,
          name: preset.name,
          fontId,
          fontName: font.name,
          fontFamily: font.family,
          text: text.trim() || "Your words appear here",
          textColor,
          accentColor,
          startAt: Math.max(0, Number(startAt) || 0),
          endAt: Math.max((Number(startAt) || 0) + 0.5, Number(endAt) || 5),
          animation: preset.animation,
          boxed: Boolean(preset.boxed),
          uppercase: Boolean(preset.uppercase),
        }];
    const destination = `${FileSystem.cacheDirectory}${localDateKey()}-${exportStem(projectTitle || text, "nomadic-paws-video")}.mp4`;
    setRendering(true);
    setFinishedVideo(undefined);
    setRenderProgress(0.02);
    setRenderStage("Preparing your video");
    setMessage("");
    const subscription = listenForRenderProgress((event) => {
      setRenderProgress(Math.max(0, Math.min(1, event.progress)));
      setRenderStage(event.stage);
    });
    try {
      const uri = await renderNomadicVideo(
        clip.uri,
        destination,
        layers.map((layer) => ({
          text: layer.text,
          fontName: layer.fontFamily,
          textColor: layer.textColor,
          accentColor: layer.accentColor,
          startAt: layer.startAt,
          endAt: layer.endAt,
          animation: layer.animation,
          boxed: layer.boxed,
          uppercase: layer.uppercase,
        })),
      );
      setFinishedVideo(uri);
      setRenderProgress(1);
      setRenderStage("Finished and ready");
      setMessage("Your finished video is ready. Save it to Photos or open the iPhone share sheet.");
    } catch (reason) {
      setRenderStage("Could not finish this video");
      setMessage(reason instanceof Error ? reason.message : "The finished video could not be created. Try again with the original clip.");
    } finally {
      subscription.remove();
      setRendering(false);
    }
  }
  async function saveFinishedVideoToPhotos() {
    if (!finishedVideo) return;
    const permission = await ExpoMediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      setMessage("Allow Photos access to save the finished video to your iPhone.");
      return;
    }
    await ExpoMediaLibrary.saveToLibraryAsync(finishedVideo);
    setMessage("Finished video saved to Photos. ✨");
  }
  async function shareFinishedVideo() {
    if (!finishedVideo) return;
    if (!(await Sharing.isAvailableAsync())) {
      setMessage("The iPhone share sheet is not available right now.");
      return;
    }
    await Sharing.shareAsync(finishedVideo, { mimeType: "video/mp4", UTI: "public.mpeg-4", dialogTitle: "Share the finished Nomadic Paws video" });
  }
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>VIDEO STUDIO</Text>
      <Text style={styles.pageTitle}>Make the words move.</Text>
      <Text style={styles.copy}>
        {person === "Trinitie"
          ? "Choose a Cheeto moment, then shape the editable text without leaving your studio."
          : "Prepare reusable video treatments for Reels, TikTok, and YouTube Shorts."}
      </Text>
      <View style={styles.videoProjectSection}>
        <View style={styles.listHeading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>Shared video projects</Text>
            <Text style={styles.videoProjectIntro}>
              Reopen the same editable timeline on either phone.
            </Text>
          </View>
          <Pressable onPress={newProject} style={styles.videoNewProjectButton}>
            <Text style={styles.videoNewProjectText}>＋ New</Text>
          </Pressable>
        </View>
        {projects.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoProjectRail}>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => openProject(project)}
                accessibilityRole="button"
                accessibilityState={{ selected: activeProjectId === project.id }}
                style={[styles.videoProjectCard, activeProjectId === project.id && styles.videoProjectCardActive]}
              >
                <View style={styles.videoProjectCardTop}>
                  <Text style={styles.videoProjectStatus}>{project.status}</Text>
                  {activeProjectId === project.id ? <Text style={styles.videoProjectCheck}>✓</Text> : null}
                </View>
                <Text numberOfLines={2} style={styles.videoProjectTitle}>{project.title}</Text>
                <Text style={styles.videoProjectMeta}>
                  Next with {project.assignedTo} · {project.overlays.length} layer{project.overlays.length === 1 ? "" : "s"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.helperCopy}>Your first saved video will appear here for Katie and Trinitie.</Text>
        )}
        <Text style={styles.controlLabel}>Project title</Text>
        <TextInput value={projectTitle} onChangeText={setProjectTitle} style={styles.input} placeholder="What are we making?" placeholderTextColor="#8b8075" />
        <Text style={styles.controlLabel}>Destinations</Text>
        <View style={styles.videoChoiceWrap}>
          {(["Instagram Reels", "TikTok", "YouTube Shorts"] as const).map((platform) => (
            <Pressable key={platform} onPress={() => toggleVideoPlatform(platform)} accessibilityRole="checkbox" accessibilityState={{ checked: platforms.includes(platform) }} style={[styles.videoChoice, platforms.includes(platform) && styles.videoChoiceActive]}>
              <Text style={[styles.videoChoiceText, platforms.includes(platform) && styles.videoChoiceTextActive]}>{platforms.includes(platform) ? "✓ " : ""}{platform}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.controlLabel}>Stage</Text>
        <View style={styles.videoChoiceWrap}>
          {(["Draft", "Ready", "Handed Off", "Posted"] as const).map((status) => (
            <Pressable key={status} onPress={() => setProjectStatus(status)} accessibilityRole="radio" accessibilityState={{ checked: projectStatus === status }} style={[styles.videoChoice, projectStatus === status && styles.videoChoiceActive]}>
              <Text style={[styles.videoChoiceText, projectStatus === status && styles.videoChoiceTextActive]}>{status}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.controlLabel}>Next with</Text>
        <View style={styles.videoChoiceWrap}>
          {(["Katie", "Trinitie"] as const).map((personName) => (
            <Pressable key={personName} onPress={() => setAssignedTo(personName)} accessibilityRole="radio" accessibilityState={{ checked: assignedTo === personName }} style={[styles.videoChoice, assignedTo === personName && styles.videoChoiceActive]}>
              <Text style={[styles.videoChoiceText, assignedTo === personName && styles.videoChoiceTextActive]}>{personName}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable onPress={chooseClip} style={styles.clipPicker}>
        <View style={styles.clipPickerIcon}>
          <Text style={styles.clipPickerPlus}>＋</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clipPickerTitle}>
            {clip ? "Change video from Photos" : "Choose from iPhone Photos"}
          </Text>
          <Text numberOfLines={2} style={styles.clipPickerCopy}>
            {clipMessage}
          </Text>
        </View>
      </Pressable>
      <View style={styles.sharedVideoSection}>
        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>Shared Media Library</Text>
          <Text style={styles.listCount}>{sharedVideos.length} videos</Text>
        </View>
        {sharedVideos.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sharedVideoRow}
          >
            {sharedVideos.map((asset) => (
              <Pressable
                key={asset.id}
                onPress={() => chooseSharedClip(asset)}
                style={[
                  styles.sharedVideoCard,
                  clip?.name === asset.original_name && styles.sharedVideoCardActive,
                ]}
              >
                <Text style={styles.sharedVideoIcon}>▶</Text>
                <Text numberOfLines={2} style={styles.sharedVideoName}>
                  {asset.original_name}
                </Text>
                <Text style={styles.sharedVideoMeta}>Shared by Katie</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.helperCopy}>
            Videos added to an Adventure will appear here for Katie and Trinitie.
          </Text>
        )}
      </View>
      <View style={styles.videoPreview}>
        {clip ? (
          <VideoView
            player={player}
            style={styles.videoPreviewImage}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{
              uri: "https://nomadicpaws.co/images/hero/cheeto-desert-sunset-mobile-720.jpg",
            }}
            style={styles.videoPreviewImage}
          />
        )}
        <Animated.View
          style={[
            styles.videoOverlay,
            preset.boxed && { backgroundColor: `${accentColor}e8` },
            {
              opacity: previewMotion,
              transform: [
                {
                  scale: previewMotion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [preset.animation === "Pop" ? 0.62 : 1, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.videoOverlayText,
              {
                color: textColor,
                fontFamily: font.family,
                textTransform: preset.uppercase ? "uppercase" : "none",
                textShadowColor: preset.boxed ? "transparent" : accentColor,
              },
            ]}
          >
            {playing ? previewText : text || "Your words appear here"}
          </Text>
        </Animated.View>
        <View style={styles.videoProgress}>
          <View style={styles.videoProgressFill} />
        </View>
      </View>
      <Pressable
        onPress={playPreview}
        style={[
          styles.previewPlayButton,
          playing && styles.previewPlayButtonActive,
        ]}
      >
        <Text style={styles.previewPlayIcon}>{playing ? "■" : "▶"}</Text>
        <Text style={styles.previewPlayText}>
          {playing ? "Stop preview" : "Play animation preview"}
        </Text>
      </Pressable>
      <View style={styles.videoMeta}>
        <Text style={styles.videoMetaTitle}>{preset.name}</Text>
        <Text style={styles.videoMetaCopy}>
          {preset.animation} · editable text · 9:16 safe
        </Text>
      </View>
      <Text style={styles.controlLabel}>Overlay style</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.overlayRail}
      >
        {videoOverlayPresets.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => choosePreset(item.id)}
            style={[
              styles.overlayPreset,
              item.id === presetId && styles.overlayPresetActive,
            ]}
          >
            <View
              style={[
                styles.overlaySwatch,
                { backgroundColor: item.defaultAccent },
              ]}
            >
              <Text
                style={{
                  color: item.defaultColor,
                  fontWeight: "900",
                  fontSize: 11,
                }}
              >
                {item.example}
              </Text>
            </View>
            <Text style={styles.overlayPresetName}>{item.name}</Text>
            <Text style={styles.overlayPresetAnimation}>{item.animation}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.controlLabel}>Editable on-screen text</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        style={[styles.input, styles.videoTextInput]}
        placeholder="Type or dictate the overlay"
        placeholderTextColor="#8b8075"
      />
      <Text style={styles.controlLabel}>Font</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fontRail}
      >
        {videoFonts.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setFontId(item.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: item.id === fontId }}
            style={[
              styles.fontChoice,
              item.id === fontId && styles.fontChoiceActive,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.fontChoiceSample, { fontFamily: item.family }]}
            >
              {text || item.preview}
            </Text>
            <View style={styles.fontChoiceFooter}>
              <Text style={styles.fontChoiceName}>{item.name}</Text>
              {item.id === fontId ? (
                <Text style={styles.fontCheck}>✓</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.controlLabel}>Text color</Text>
      <View style={styles.videoPalette}>
        {palette.map((item) => (
          <Pressable
            key={`text-${item.name}`}
            onPress={() => setTextColor(item.value)}
            accessibilityLabel={`${item.name} text`}
            style={[
              styles.colorDot,
              { backgroundColor: item.value },
              textColor === item.value && styles.colorDotSelected,
            ]}
          />
        ))}
      </View>
      <Text style={styles.controlLabel}>
        {preset.boxed ? "Label color" : "Outline or glow color"}
      </Text>
      <View style={styles.videoPalette}>
        {palette.map((item) => (
          <Pressable
            key={`accent-${item.name}`}
            onPress={() => setAccentColor(item.value)}
            accessibilityLabel={`${item.name} accent`}
            style={[
              styles.colorDot,
              { backgroundColor: item.value },
              accentColor === item.value && styles.colorDotSelected,
            ]}
          />
        ))}
      </View>
      <View style={styles.overlayTiming}>
        <View>
          <Text style={styles.overlayTimingLabel}>Appears · seconds</Text>
          <TextInput
            value={startAt}
            onChangeText={setStartAt}
            keyboardType="decimal-pad"
            style={styles.overlayTimeInput}
          />
        </View>
        <View style={styles.overlayTimingTrack}>
          <View style={styles.overlayTimingFill} />
        </View>
        <View>
          <Text style={styles.overlayTimingLabel}>Ends · seconds</Text>
          <TextInput
            value={endAt}
            onChangeText={setEndAt}
            keyboardType="decimal-pad"
            style={styles.overlayTimeInput}
          />
        </View>
      </View>
      <Pressable onPress={addToTimeline} style={styles.primary}>
        <Text style={styles.primaryText}>Add overlay to video</Text>
      </Pressable>
      {message ? <Text style={styles.syncMessage}>{message}</Text> : null}
      {timeline.length ? (
        <View style={styles.videoTimeline}>
          <View style={styles.listHeading}>
            <Text style={styles.listTitle}>Overlay timeline</Text>
            <Text style={styles.listCount}>
              {timeline.length} layer{timeline.length === 1 ? "" : "s"}
            </Text>
          </View>
          {timeline.map((item, index) => (
            <View key={item.id} style={styles.timelineOverlay}>
              <View
                style={[
                  styles.timelineNumber,
                  { backgroundColor: item.accentColor },
                ]}
              >
                <Text style={{ color: item.textColor, fontWeight: "900" }}>
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timelineOverlayName}>
                  {item.name} · {item.fontName}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.timelineOverlayText,
                    { fontFamily: item.fontFamily },
                  ]}
                >
                  {item.text}
                </Text>
              </View>
              <Text style={styles.timelineOverlayTime}>
                {item.startAt.toFixed(1)}–{item.endAt.toFixed(1)}s
              </Text>
            </View>
          ))}
          <Pressable onPress={saveSharedProject} disabled={savingProject} style={styles.videoDraftButton}>
            <Text style={styles.videoDraftButtonText}>{savingProject ? "Saving…" : "Save shared video project"}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={saveSharedProject} disabled={savingProject} style={styles.videoDraftButton}>
          <Text style={styles.videoDraftButtonText}>{savingProject ? "Saving…" : "Save shared video project"}</Text>
        </Pressable>
      )}
      {!selectedMediaId && clip ? (
        <Text style={styles.helper}>This local clip stays on this iPhone. Choose the same video from the Shared Media Library if Trinitie should reopen it on her phone.</Text>
      ) : null}
      <View style={styles.videoExportCard}>
        <Text style={styles.eyebrow}>FINISHED VIDEO</Text>
        <Text style={styles.videoExportTitle}>Ready to make it real?</Text>
        <Text style={styles.videoExportCopy}>The iPhone will render the selected clip, every timeline layer, its colors, font, and animation into one private 9:16 video.</Text>
        {rendering || renderProgress > 0 ? (
          <View style={styles.videoRenderProgressTrack}>
            <View style={[styles.videoRenderProgressFill, { width: `${Math.max(3, renderProgress * 100)}%` }]} />
          </View>
        ) : null}
        {renderStage ? <Text style={styles.videoRenderStage}>{renderStage}{rendering ? ` · ${Math.round(renderProgress * 100)}%` : ""}</Text> : null}
        <Pressable onPress={createFinishedVideo} disabled={rendering} style={[styles.primary, rendering && { opacity: 0.65 }]}>
          <Text style={styles.primaryText}>{rendering ? "Creating finished video…" : finishedVideo ? "Create it again" : "Create finished video"}</Text>
        </Pressable>
        {finishedVideo ? (
          <View style={styles.videoExportActions}>
            <Pressable onPress={saveFinishedVideoToPhotos} style={styles.videoExportAction}><Text style={styles.videoExportActionText}>Save to Photos</Text></Pressable>
            <Pressable onPress={shareFinishedVideo} style={styles.videoExportAction}><Text style={styles.videoExportActionText}>Share…</Text></Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Pinterest({
  token,
  initialStorySlug,
  onInitialStoryOpened,
}: {
  token: string;
  initialStorySlug?: string;
  onInitialStoryOpened: () => void;
}) {
  const [stories, setStories] = useState<JournalStory[]>([]),
    [media, setMedia] = useState<SharedMediaAsset[]>([]),
    [campaigns, setCampaigns] = useState<PinterestCampaign[]>([]),
    [selected, setSelected] = useState<JournalStory>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false),
    [uploadingPin, setUploadingPin] = useState<number>(),
    [importAdventureId, setImportAdventureId] = useState(""),
    [board, setBoard] = useState("Nomadic Paws Trail Journal"),
    [keywords, setKeywords] = useState(""),
    [retroactive, setRetroactive] = useState(false),
    [pins, setPins] = useState<PinterestPinDraft[]>([
      { title: "", description: "", logo: "bark", size: "small", side: "left", focus: "center" },
      { title: "", description: "", logo: "sage", size: "small", side: "left", focus: "center" },
      { title: "", description: "", logo: "sand", size: "small", side: "left", focus: "center" },
      { title: "", description: "", logo: "terracotta", size: "small", side: "left", focus: "center" },
    ]);
  useEffect(() => {
    Promise.all([
      loadStories(token),
      loadSharedMedia(token),
      loadPinterestCampaigns(token),
    ])
      .then(([storyData, mediaData, campaignData]) => {
        setStories(storyData.stories);
        setMedia(mediaData.media);
        setImportAdventureId(
          mediaData.adventures.find(
            (item) => item.title === "Pinterest photo imports",
          )?.id || "",
        );
        setCampaigns(campaignData.campaigns);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => {
    if (!initialStorySlug || selected || !stories.length) return;
    const story = stories.find((item) => item.slug === initialStorySlug);
    if (!story) return;
    selectStory(story);
    onInitialStoryOpened();
  }, [initialStorySlug, onInitialStoryOpened, selected, stories]);
  function selectStory(story: JournalStory) {
    setSelected(story);
    setMessage("");
    const saved = campaigns.find((campaign) => campaign.post_slug === story.slug);
    setBoard(saved?.board || "Nomadic Paws Trail Journal");
    setKeywords(saved?.keywords || "");
    setRetroactive(saved?.retroactive ?? story.status === "Published");
    const savedPins = saved
      ? [saved.rss_pin, saved.day_7_pin, saved.day_14_pin, saved.day_21_pin]
      : [];
    setPins(
      ["bark", "sage", "sand", "terracotta"].map((color, index) => ({
        title: savedPins[index]?.title || story.title,
        description: savedPins[index]?.description || story.description,
        logo: (savedPins[index]?.template || color) as Exclude<LogoColor, "none">,
        size: savedPins[index]?.logo_size || "small",
        side: savedPins[index]?.logo_placement || "left",
        focus: "center",
        finishedImage: savedPins[index]?.image,
      })),
    );
  }
  async function choosePinterestPhoto(index: number) {
    setUploadingPin(index);
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled) return;
      let adventureId = importAdventureId;
      if (!adventureId) {
        const adventure = await createSharedAdventure(token, {
          title: "Pinterest photo imports",
          notes: "Original photos selected directly while preparing Pinterest campaigns.",
          privateLocation: "",
        });
        adventureId = adventure.id;
        setImportAdventureId(adventure.id);
      }
      const picked = result.assets[0]!;
      const asset = await uploadAdventurePhoto(token, adventureId, {
        uri: picked.uri,
        name: picked.fileName || `Pinterest-photo-${Date.now()}.jpg`,
        mimeType: picked.mimeType,
        width: picked.width,
        height: picked.height,
      });
      setMedia((current) => [asset, ...current]);
      setPins((current) =>
        current.map((pin, itemIndex) =>
          itemIndex === index
            ? { ...pin, asset, finishedImage: undefined }
            : pin,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "That photo could not be added to this campaign.",
      );
    } finally {
      setUploadingPin(undefined);
    }
  }
  async function sharePinterestCsv() {
    if (!FileSystem.cacheDirectory) return;
    setMessage("Preparing the latest Pinterest CSV…");
    setError("");
    try {
      const target = `${FileSystem.cacheDirectory}${localDateKey()}-nomadic-paws-pinterest-schedule.csv`;
      const download = await FileSystem.downloadAsync(
        `${API_URL}/pinterest.csv?fresh=${Date.now()}`,
        target,
      );
      await Sharing.shareAsync(download.uri, {
        mimeType: "text/csv",
        UTI: "public.comma-separated-values-text",
        dialogTitle: "Save or upload the Pinterest schedule",
      });
      setMessage("The current Pinterest CSV is ready to save or share.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The Pinterest CSV could not be prepared.",
      );
      setMessage("");
    }
  }
  async function saveCampaign() {
    if (!selected) return;
    if (pins.some((pin) => !pin.asset && !pin.finishedImage)) {
      setError("Choose a photo for each of the four Pins first.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("Preparing four finished Pinterest images…");
    try {
      const finished = [];
      for (const pin of pins) {
        let imagePath = pin.finishedImage || "";
        if (pin.asset) {
          const version = await saveWorkingVersion(token, pin.asset.id, "pinterest", {
            logoColor: pin.logo,
            logoSize: pin.size,
            logoSide: pin.side,
            focus: pin.focus,
          });
          imagePath = publicWorkingImagePath(version.id);
        }
        finished.push({
          image: imagePath,
          title: pin.title.trim(),
          description: pin.description.trim(),
          template: pin.logo,
          logo_size: pin.size,
          logo_placement: pin.side,
        });
      }
      const campaign: PinterestCampaign = {
        post_slug: selected.slug,
        campaign_title: selected.title,
        board: board.trim(),
        keywords: keywords.trim(),
        retroactive,
        enabled: true,
        rss_pin: finished[0]!,
        day_7_pin: finished[1]!,
        day_14_pin: finished[2]!,
        day_21_pin: finished[3]!,
      };
      const saved = (await savePinterestCampaign(token, campaign)).campaign;
      setCampaigns((current) => [saved, ...current.filter((item) => item.post_slug !== saved.post_slug)]);
      setMessage(
        retroactive
          ? "Campaign saved. All four images will fill the next open CSV dates."
          : "Campaign saved. The first image is ready for RSS after publication; the others are scheduled for +7, +14, and +21 days.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pinterest campaign could not be saved.");
      setMessage("");
    } finally {
      setSaving(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>PINTEREST WORKSPACE</Text>
      <Text style={styles.pageTitle}>Build a beautiful campaign.</Text>
      <Text style={styles.copy}>
        Choose the story once, then prepare all four Pins without opening the
        article editor.
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.terracotta} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <StoryPicker
          stories={stories}
          selected={selected}
          onSelect={selectStory}
        />
      )}
      {selected ? (
        <>
          <Text style={styles.controlLabel}>Pinterest board</Text>
          <TextInput value={board} onChangeText={setBoard} style={styles.input} />
          <Text style={styles.controlLabel}>Keywords</Text>
          <TextInput
            value={keywords}
            onChangeText={setKeywords}
            multiline
            style={[styles.input, styles.notesInput]}
            placeholder="Comma-separated phrases that genuinely fit the story"
            placeholderTextColor="#8b8075"
          />
          <Pressable onPress={() => setRetroactive((current) => !current)} style={styles.retroactiveChoice}>
            <Text style={styles.retroactiveCheck}>{retroactive ? "✓" : "○"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.retroactiveTitle}>Retroactive article</Text>
              <Text style={styles.retroactiveCopy}>Use the next open CSV dates instead of the new-article RSS sequence.</Text>
            </View>
          </Pressable>
          {pins.map((pin, index) => (
            <PinCard
              key={index}
              token={token}
              media={media}
              number={index + 1}
              value={pin}
              onChange={(next) => setPins((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))}
              onChooseFromPhotos={() => choosePinterestPhoto(index)}
              uploading={uploadingPin === index}
            />
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          <Pressable disabled={saving} onPress={saveCampaign} style={[styles.primary, saving && styles.primaryDisabled]}>
            <Text style={styles.primaryText}>{saving ? "Preparing campaign…" : "Save Pinterest campaign"}</Text>
          </Pressable>
          <Pressable onPress={sharePinterestCsv} style={styles.secondary}>
            <Text style={styles.secondaryText}>Share latest Pinterest CSV</Text>
          </Pressable>
          <Text style={styles.helper}>
            RSS and CSV keep their existing public URLs. A Pin never enters RSS
            until its Trail Journal article is publicly available.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>NOMADIC PAWS ADMIN</Text>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.copy}>{text}</Text>
    </ScrollView>
  );
}

function TeamAccess({
  token,
  onSignOut,
}: {
  token: string;
  onSignOut: () => void;
}) {
  const [pending, setPending] = useState<AppUser[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState("");
  const [deviceLock, setDeviceLock] = useState(false);
  const refresh = () =>
    loadTeamAccess(token)
      .then((data) => setPending(data.pending))
      .catch((reason) =>
        setMessage(
          reason instanceof Error
            ? reason.message
            : "Team access could not load.",
        ),
      );
  useEffect(() => {
    refresh();
  }, [token]);
  useEffect(() => {
    SecureStore.getItemAsync(DEVICE_LOCK_KEY).then((value) =>
      setDeviceLock(value === "on"),
    );
  }, []);
  async function toggleDeviceLock() {
    const next = !deviceLock;
    await SecureStore.setItemAsync(DEVICE_LOCK_KEY, next ? "on" : "off");
    setDeviceLock(next);
    setMessage(
      next
        ? "Extra iPhone confirmation is on."
        : "Extra iPhone confirmation is off.",
    );
  }
  async function approve(user: AppUser, role: "trinitie" | "mom") {
    setBusy(user.id);
    setMessage("");
    try {
      await approveTeamAccess(token, user.id, role);
      setMessage(
        `${role === "mom" ? "CatNana" : "Trinitie"} has her own door now.`,
      );
      refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Access could not be approved.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>PRIVATE TEAM ACCESS</Text>
      <Text style={styles.pageTitle}>Their own little doors.</Text>
      <Text style={styles.copy}>
        When Trinitie or CatNana signs in with Apple for the first time, her
        account will appear here. Choose the workspace that belongs to her.
      </Text>
      {pending.length ? (
        pending.map((user) => (
          <View key={user.id} style={styles.teamCard}>
            <Text style={styles.teamName}>
              {user.name || "New team member"}
            </Text>
            <Text style={styles.teamEmail}>
              {user.email || "Apple private email"}
            </Text>
            <View style={styles.teamActions}>
              <Pressable
                disabled={Boolean(busy)}
                onPress={() => approve(user, "trinitie")}
                style={styles.teamButton}
              >
                <Text style={styles.teamButtonText}>Trinitie</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(busy)}
                onPress={() => approve(user, "mom")}
                style={styles.teamButton}
              >
                <Text style={styles.teamButtonText}>CatNana</Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.teamEmpty}>
          <Text style={styles.teamEmptyTitle}>Nobody is waiting.</Text>
          <Text style={styles.teamEmptyCopy}>
            Their first Apple sign-in will place them here—no code to text,
            copy, or lose.
          </Text>
        </View>
      )}
      <Pressable onPress={toggleDeviceLock} style={styles.deviceLock}>
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName}>Extra iPhone confirmation</Text>
          <Text style={styles.teamEmail}>
            Uses Face ID when available, with the iPhone passcode as the
            fallback.
          </Text>
        </View>
        <Text style={styles.deviceLockState}>{deviceLock ? "On" : "Off"}</Text>
      </Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Pressable onPress={refresh} style={styles.secondary}>
        <Text style={styles.secondaryText}>Check for new sign-ins</Text>
      </Pressable>
      <Pressable onPress={onSignOut} style={styles.secondary}>
        <Text style={styles.secondaryText}>Sign out on this iPhone</Text>
      </Pressable>
    </ScrollView>
  );
}

function WorkingPhotoEditor({
  token,
  asset,
  onSaved,
  destinations = ["trail-hero", "trail-article", "pinterest", "instagram"],
  initialDestination = "instagram",
}: {
  token: string;
  asset: SharedMediaAsset;
  onSaved: (version?: WorkingVersion) => void;
  destinations?: PhotoDestination[];
  initialDestination?: PhotoDestination;
}) {
  const [destination, setDestination] =
      useState<PhotoDestination>(initialDestination),
    [logoColor, setLogoColor] = useState<LogoColor>("bark"),
    [logoSize, setLogoSize] = useState<LogoSize>("small"),
    [logoSide, setLogoSide] = useState<LogoSide>("left"),
    [focus, setFocus] = useState<"top" | "center" | "bottom">("center"),
    [saving, setSaving] = useState(false),
    [sharing, setSharing] = useState(false),
    [savedVersion, setSavedVersion] = useState<WorkingVersion | null>(null),
    [message, setMessage] = useState("");
  const aspect =
    destination === "pinterest"
      ? 2 / 3
      : destination === "instagram"
        ? 4 / 5
        : destination === "trail-hero"
          ? 16 / 9
          : 3 / 2;
  const focusTop =
    focus === "top" ? "0%" : focus === "bottom" ? "-25%" : "-12.5%";
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const version = await saveWorkingVersion(token, asset.id, destination, {
        logoColor,
        logoSize,
        logoSide,
        focus,
      });
      setSavedVersion(version);
      setMessage("Finished image ready. The original is still untouched.");
      onSaved(version);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "That working version could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function shareFinished() {
    if (!savedVersion || !FileSystem.cacheDirectory) return;
    setSharing(true);
    setMessage("Rendering the finished image…");
    try {
      const originalStem = asset.original_name.replace(/\.[^.]+$/, "");
      const target = `${FileSystem.cacheDirectory}${localDateKey()}-${exportStem(originalStem, "nomadic-paws")}-${savedVersion.destination_type}.jpg`;
      const download = await FileSystem.downloadAsync(
        workingImageUrl(savedVersion.id),
        target,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await Sharing.shareAsync(download.uri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
        dialogTitle: "Share finished Nomadic Paws image",
      });
      setMessage("Finished image is ready whenever you need it.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "The finished image could not be shared.",
      );
    } finally {
      setSharing(false);
    }
  }
  return (
    <View style={styles.workingEditor}>
      <Text style={styles.eyebrow}>WORKING VERSION</Text>
      <Text style={styles.workingTitle}>Prepare it for somewhere.</Text>
      <Text style={styles.controlLabel}>Destination</Text>
      <View style={styles.choiceRow}>
        {destinations.map((item) => (
          <Choice
            key={item}
            value={item}
            current={destination}
            label={
              item === "trail-hero"
                ? "Journal hero"
                : item === "trail-article"
                  ? "Journal photo"
                  : item === "pinterest"
                    ? "Pinterest"
                    : "Instagram"
            }
            onPress={setDestination}
          />
        ))}
      </View>
      <View style={[styles.workingPreview, { aspectRatio: aspect }]}>
        <Image
          source={{
            uri: privateMediaUrl(asset.id),
            headers: { Authorization: `Bearer ${token}` },
          }}
          resizeMode="cover"
          style={[styles.workingPhoto, { top: focusTop as `${number}%` }]}
        />
        {logoColor !== "none" ? (
          <Image
            source={{
              uri: `${API_URL}/images/pinterest-logos/logo-${logoColor}.png`,
            }}
            resizeMode="contain"
            style={[
              styles.previewLogo,
              logoSize === "medium" ? styles.logoMedium : styles.logoSmall,
              logoSide === "right" ? styles.logoRight : styles.logoLeft,
            ]}
          />
        ) : null}
      </View>
      <Text style={styles.controlLabel}>Swipe through treatments</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterStrip}
      >
        {(["none", "bark", "sage", "sand", "terracotta"] as LogoColor[]).map(
          (color) => (
            <Pressable
              key={color}
              onPress={() => setLogoColor(color)}
              style={[
                styles.filterChoice,
                logoColor === color && styles.filterChoiceActive,
              ]}
            >
              <View style={styles.filterPreview}>
                <Image
                  source={{
                    uri: privateMediaUrl(asset.id),
                    headers: { Authorization: `Bearer ${token}` },
                  }}
                  resizeMode="cover"
                  style={styles.filterPhoto}
                />
                {color !== "none" ? (
                  <Image
                    source={{
                      uri: `${API_URL}/images/pinterest-logos/logo-${color}.png`,
                    }}
                    resizeMode="contain"
                    style={styles.filterLogo}
                  />
                ) : null}
              </View>
              <Text style={styles.filterName}>
                {color === "none"
                  ? "Original"
                  : color[0]!.toUpperCase() + color.slice(1)}
              </Text>
            </Pressable>
          ),
        )}
      </ScrollView>
      <Text style={styles.controlLabel}>Crop focus</Text>
      <View style={styles.choiceRow}>
        <Choice value="top" current={focus} label="Top" onPress={setFocus} />
        <Choice
          value="center"
          current={focus}
          label="Center"
          onPress={setFocus}
        />
        <Choice
          value="bottom"
          current={focus}
          label="Bottom"
          onPress={setFocus}
        />
      </View>
      <Text style={styles.controlLabel}>Logo color</Text>
      <View style={styles.choiceRow}>
        {logoChoices.map((item) => (
          <Choice
            key={item.value}
            {...item}
            current={logoColor}
            onPress={setLogoColor}
          />
        ))}
      </View>
      <Text style={styles.controlLabel}>Logo size</Text>
      <View style={styles.choiceRow}>
        <Choice
          value="small"
          current={logoSize}
          label="Small"
          onPress={setLogoSize}
        />
        <Choice
          value="medium"
          current={logoSize}
          label="Medium"
          onPress={setLogoSize}
        />
      </View>
      <Text style={styles.controlLabel}>Logo side</Text>
      <View style={styles.choiceRow}>
        <Choice
          value="left"
          current={logoSide}
          label="Left"
          onPress={setLogoSide}
        />
        <Choice
          value="right"
          current={logoSide}
          label="Right"
          onPress={setLogoSide}
        />
      </View>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Pressable
        disabled={saving}
        onPress={save}
        style={[styles.primary, saving && styles.primaryDisabled]}
      >
        <Text style={styles.primaryText}>
          {saving ? "Saving…" : "Render finished image"}
        </Text>
      </Pressable>
      {savedVersion ? (
        <Pressable
          disabled={sharing}
          onPress={shareFinished}
          style={styles.shareButton}
        >
          <Text style={styles.shareButtonText}>
            {sharing ? "Preparing…" : "Save or share finished image"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SharedVideoPreview({
  token,
  asset,
}: {
  token: string;
  asset: SharedMediaAsset;
}) {
  const player = useVideoPlayer({
    uri: privateMediaUrl(asset.id),
    headers: { Authorization: `Bearer ${token}` },
  });
  return (
    <VideoView
      player={player}
      style={styles.mediaModalImage}
      contentFit="contain"
      nativeControls
    />
  );
}

function MediaLibrary({
  token,
  adventures,
  media,
  onUpdated,
  onWorkingSaved,
}: {
  token: string;
  adventures: SharedAdventure[];
  media: SharedMediaAsset[];
  onUpdated: (asset: SharedMediaAsset) => void;
  onWorkingSaved: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "unused" | "used">("all"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<SharedMediaAsset | null>(null),
    [workingAsset, setWorkingAsset] = useState<SharedMediaAsset | null>(null),
    [draftTags, setDraftTags] = useState<string[]>([]),
    [draftNotes, setDraftNotes] = useState(""),
    [savingDetails, setSavingDetails] = useState(false),
    [detailMessage, setDetailMessage] = useState("");
  const adventureName = (id: string | null) =>
    adventures.find((item) => item.id === id)?.title ||
    "Unsorted Cheeto moment";
  function openAsset(asset: SharedMediaAsset) {
    setSelected(asset);
    setDraftTags(asset.tags || []);
    setDraftNotes(asset.notes || "");
    setDetailMessage("");
  }
  function toggleTag(tag: string) {
    setDraftTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }
  async function saveDetails() {
    if (!selected) return;
    setSavingDetails(true);
    setDetailMessage("");
    try {
      const updated = {
        ...selected,
        ...(await updateSharedMedia(token, selected.id, draftTags, draftNotes)),
      };
      onUpdated(updated);
      setSelected(updated);
      setDetailMessage("Shared details saved.");
    } catch (reason) {
      setDetailMessage(
        reason instanceof Error
          ? reason.message
          : "Those details could not be saved.",
      );
    } finally {
      setSavingDetails(false);
    }
  }
  const visible = media.filter((asset) => {
    const matchesState =
      filter === "all" ||
      (filter === "unused" ? !asset.usage_count : asset.usage_count > 0);
    const haystack =
      `${asset.original_name} ${adventureName(asset.adventure_id)} ${asset.tags.join(" ")}`.toLowerCase();
    return matchesState && haystack.includes(query.trim().toLowerCase());
  });
  const groups = adventures
    .map((adventure) => ({
      adventure,
      media: visible.filter((asset) => asset.adventure_id === adventure.id),
    }))
    .filter((group) => group.media.length);
  const ungrouped = visible.filter(
    (asset) =>
      !asset.adventure_id ||
      !adventures.some((adventure) => adventure.id === asset.adventure_id),
  );
  const renderCard = (asset: SharedMediaAsset) => (
    <View key={asset.id} style={styles.mediaCard}>
      <Pressable onPress={() => openAsset(asset)}>
        {asset.kind === "video" ? (
          <View style={[styles.mediaImage, styles.mediaVideoPlaceholder]}>
            <Text style={styles.mediaVideoPlay}>▶</Text>
            <Text style={styles.mediaVideoLabel}>VIDEO</Text>
          </View>
        ) : (
          <Image
            source={{
              uri: privateMediaUrl(asset.id),
              headers: { Authorization: `Bearer ${token}` },
            }}
            style={styles.mediaImage}
          />
        )}
        <View style={styles.mediaBadge}>
          <Text style={styles.mediaBadgeText}>
            {asset.usage_count ? `Used ${asset.usage_count}` : "Unused"}
          </Text>
        </View>
        <View style={styles.mediaInfo}>
          <Text numberOfLines={1} style={styles.mediaName}>
            {asset.original_name}
          </Text>
          {asset.tags?.length ? (
            <Text numberOfLines={1} style={styles.mediaTagsLine}>
              {asset.tags.join(" · ")}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {asset.kind === "photo" ? (
        <Pressable
          onPress={() => setWorkingAsset(asset)}
          style={styles.prepareButton}
        >
          <Text style={styles.prepareButtonText}>Prepare photo</Text>
        </Pressable>
      ) : (
        <View style={styles.prepareButton}>
          <Text style={styles.prepareButtonText}>Ready in Video Studio</Text>
        </View>
      )}
    </View>
  );
  return (
    <>
      <Modal
        visible={Boolean(workingAsset)}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkingAsset(null)}
      >
        {workingAsset ? (
          <SafeAreaView style={styles.workingModal}>
            <ScrollView contentContainerStyle={styles.workingModalPage}>
              <Pressable onPress={() => setWorkingAsset(null)}>
                <Text style={styles.backText}>‹ Media Library</Text>
              </Pressable>
              <WorkingPhotoEditor
                token={token}
                asset={workingAsset}
                onSaved={onWorkingSaved}
              />
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>SHARED MEDIA LIBRARY</Text>
        <Text style={styles.pageTitle}>Every Cheeto moment, intact.</Text>
        <Text style={styles.copy}>
          Original photos and videos are shared privately between Katie and
          Trinitie. Every edit uses a working copy—never the original.
        </Text>
        {media.length ? (
          <>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search adventures or file names"
              placeholderTextColor="#8b8075"
              style={styles.input}
            />
            <View style={styles.choiceRow}>
              <Choice
                value="all"
                current={filter}
                label={`All · ${media.length}`}
                onPress={setFilter}
              />
              <Choice
                value="unused"
                current={filter}
                label={`Unused · ${media.filter((item) => !item.usage_count).length}`}
                onPress={setFilter}
              />
              <Choice
                value="used"
                current={filter}
                label="Used"
                onPress={setFilter}
              />
            </View>
            {groups.map((group) => (
              <View key={group.adventure.id} style={styles.mediaGroup}>
                <View style={styles.mediaGroupHeading}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mediaGroupTitle}>
                      {group.adventure.title}
                    </Text>
                    <Text style={styles.mediaGroupMeta}>
                      {new Date(
                        `${group.adventure.captured_at}T12:00:00`,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {group.media.length} item
                      {group.media.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <Text style={styles.mediaGroupState}>
                    {group.adventure.status}
                  </Text>
                </View>
                <View style={styles.mediaGrid}>
                  {group.media.map(renderCard)}
                </View>
              </View>
            ))}
            {ungrouped.length ? (
              <View style={styles.mediaGroup}>
                <Text style={styles.mediaGroupTitle}>Unsorted moments</Text>
                <View style={styles.mediaGrid}>
                  {ungrouped.map(renderCard)}
                </View>
              </View>
            ) : null}
            {!visible.length ? (
              <View style={styles.teamEmpty}>
                <Text style={styles.teamEmptyTitle}>
                  No media match that view.
                </Text>
                <Text style={styles.teamEmptyCopy}>
                  Try All or clear the search.
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.teamEmpty}>
            <Text style={styles.teamEmptyTitle}>The library is ready.</Text>
            <Text style={styles.teamEmptyCopy}>
              Katie’s first Adventure upload will appear here for both Katie and
              Trinitie.
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          <View style={styles.mediaModalBackdrop}>
            <ScrollView contentContainerStyle={styles.mediaModal}>
              {selected.kind === "video" ? (
                <SharedVideoPreview token={token} asset={selected} />
              ) : (
                <Image
                  resizeMode="contain"
                  source={{
                    uri: privateMediaUrl(selected.id),
                    headers: { Authorization: `Bearer ${token}` },
                  }}
                  style={styles.mediaModalImage}
                />
              )}
              <View style={styles.mediaModalBody}>
                <Text style={styles.eyebrow}>
                  {selected.usage_count
                    ? `USED ${selected.usage_count} TIME${selected.usage_count === 1 ? "" : "S"}`
                    : "ORIGINAL · UNUSED"}
                </Text>
                <Text style={styles.mediaModalTitle}>
                  {adventureName(selected.adventure_id)}
                </Text>
                <Text numberOfLines={2} style={styles.mediaModalFile}>
                  {selected.original_name} ·{" "}
                  {(selected.byte_size / 1024 / 1024).toFixed(1)} MB
                </Text>
                <Text style={styles.controlLabel}>Quick tags</Text>
                <View style={styles.choiceRow}>
                  {mediaTags.map((tag) => (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.choice,
                        draftTags.includes(tag) && styles.choiceSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          draftTags.includes(tag) && styles.choiceTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.controlLabel}>Shared note</Text>
                <TextInput
                  value={draftNotes}
                  onChangeText={setDraftNotes}
                  maxLength={500}
                  multiline
                  placeholder="A detail Trinitie or future-you should know"
                  placeholderTextColor="#8b8075"
                  style={[styles.input, styles.notesInput]}
                />
                <Text style={styles.mediaModalNote}>
                  Safe original. Tags and notes help organize it; edits still
                  create a separate working version.
                </Text>
                {detailMessage ? (
                  <Text style={styles.success}>{detailMessage}</Text>
                ) : null}
                <Pressable
                  disabled={savingDetails}
                  onPress={saveDetails}
                  style={[
                    styles.primary,
                    savingDetails && styles.primaryDisabled,
                  ]}
                >
                  <Text style={styles.primaryText}>
                    {savingDetails ? "Saving…" : "Save shared details"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelected(null)}
                  style={styles.secondary}
                >
                  <Text style={styles.secondaryText}>Done</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </>
  );
}

function eventMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function EventRegister({ token }: { token: string }) {
  const [products, setProducts] = useState<EventProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [readerMode, setReaderMode] = useState<"simulated" | "physical">(
    "simulated",
  );
  const [readers, setReaders] = useState<Reader.Type[]>([]);
  const [locationId, setLocationId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    Reader.ConnectionStatus
  >("notConnected");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [readerBusy, setReaderBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    initialize,
    discoverReaders,
    cancelDiscovering,
    connectReader,
    disconnectReader,
    connectedReader,
    retrievePaymentIntent,
    processPaymentIntent,
    setReaderDisplay,
    getLocations,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (nextReaders) => {
      setReaders(nextReaders);
      setMessage(
        nextReaders.length
          ? `${nextReaders.length} ${readerMode === "simulated" ? "simulated" : "nearby"} reader${nextReaders.length === 1 ? "" : "s"} found.`
          : "Still looking for the reader…",
      );
    },
    onDidChangeConnectionStatus: setConnectionStatus,
  });

  async function refreshProducts() {
    setLoadingProducts(true);
    setError("");
    try {
      const data = await loadEventProducts(token);
      setProducts(data.products);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Test inventory could not synchronize.",
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    refreshProducts();
    initialize().then((result) => {
      if (result.error) setError(result.error.message);
      else setMessage("Stripe Terminal is ready for a test reader.");
    });
    return () => {
      cancelDiscovering().catch(() => {});
    };
  }, []);

  const subtotal = products.reduce(
    (sum, product) =>
      sum + product.unitPriceCents * (cart[product.sku] || 0),
    0,
  );
  const cartItems = products
    .filter((product) => (cart[product.sku] || 0) > 0)
    .map((product) => ({
      sku: product.sku,
      quantity: cart[product.sku] || 0,
    }));

  function changeQuantity(product: EventProduct, change: number) {
    setCart((current) => {
      const next = Math.max(
        0,
        Math.min(product.stock, (current[product.sku] || 0) + change),
      );
      const updated = { ...current };
      if (next) updated[product.sku] = next;
      else delete updated[product.sku];
      return updated;
    });
  }

  async function findReader() {
    setReaderBusy(true);
    setError("");
    setReaders([]);
    try {
      if (connectionStatus === "discovering") await cancelDiscovering();
      let stripeLocation = locationId;
      if (!stripeLocation) {
        const locations = await getLocations({ limit: 10 });
        if (locations.error) throw locations.error;
        stripeLocation = locations.locations?.[0]?.id || "";
        setLocationId(stripeLocation);
      }
      if (!stripeLocation)
        throw new Error(
          "Create a Stripe Terminal location before connecting a reader.",
        );
      const result = await discoverReaders({
        discoveryMethod: "bluetoothScan",
        simulated: readerMode === "simulated",
        timeout: 12,
      });
      if (result.error) throw result.error;
      setMessage(
        readerMode === "simulated"
          ? "Opening Stripe’s simulated reader…"
          : "Scanning nearby Bluetooth readers for 12 seconds…",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Reader scan could not start.",
      );
    } finally {
      setReaderBusy(false);
    }
  }

  async function connectToReader(reader: Reader.Type) {
    setReaderBusy(true);
    setError("");
    try {
      await cancelDiscovering().catch(() => {});
      const result = await connectReader({
        discoveryMethod: "bluetoothScan",
        reader,
        locationId: reader.locationId || reader.location?.id || locationId,
        autoReconnectOnUnexpectedDisconnect: true,
      });
      if (result.error) throw result.error;
      setMessage(
        `${readerMode === "simulated" ? "Simulated reader" : reader.label || reader.serialNumber} connected.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The reader could not connect.",
      );
    } finally {
      setReaderBusy(false);
    }
  }

  async function waitForPaidSale(saleId: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const status = await loadEventSaleStatus(token, saleId);
      if (status.sale.status === "paid") return status.sale;
      await new Promise((resolve) => setTimeout(resolve, 1250));
    }
    return null;
  }

  async function checkout() {
    if (!connectedReader) {
      setError("Connect the simulated or physical test reader first.");
      return;
    }
    if (!cartItems.length) {
      setError("Add at least one product to the test cart.");
      return;
    }
    setCheckoutBusy(true);
    setError("");
    setMessage("Creating a protected Stripe test sale…");
    try {
      const sale = await createEventSale(token, cartItems, Crypto.randomUUID());
      await setReaderDisplay({
        currency: "usd",
        tax: sale.taxCents,
        total: sale.totalCents,
        lineItems: cartItems.map((item) => {
          const product = products.find((candidate) => candidate.sku === item.sku)!;
          return {
            displayName: product.name,
            quantity: item.quantity,
            amount: product.unitPriceCents * item.quantity,
          };
        }),
      }).catch(() => ({ error: undefined }));
      const retrieved = await retrievePaymentIntent(sale.clientSecret);
      if (retrieved.error || !retrieved.paymentIntent)
        throw retrieved.error || new Error("Stripe could not open the test payment.");
      setMessage("Present the Stripe test card to the reader.");
      const processed = await processPaymentIntent({
        paymentIntent: retrieved.paymentIntent,
      });
      if (processed.error) throw processed.error;
      setMessage("Test payment approved. Synchronizing inventory…");
      const paid = await waitForPaidSale(sale.saleId);
      setCart({});
      await refreshProducts();
      setMessage(
        paid
          ? `Test sale complete · ${eventMoney(sale.totalCents)}. Inventory synchronized.`
          : `Stripe approved ${eventMoney(sale.totalCents)}. The signed webhook is still finishing inventory in the background.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The test sale could not finish.",
      );
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.registerHeading}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>EVENT REGISTER · TEST MODE</Text>
          <Text style={styles.pageTitle}>A calm little checkout.</Text>
        </View>
        <View style={styles.testModePill}>
          <Text style={styles.testModePillText}>NO LIVE CHARGES</Text>
        </View>
      </View>
      <Text style={styles.copy}>
        Katie’s app sign-in opens the register directly. Prices and stock are
        still verified by the existing secure server before Stripe receives a
        test payment.
      </Text>
      <View style={styles.readerPanel}>
        <View style={styles.readerPanelTop}>
          <View>
            <Text style={styles.readerTitle}>Stripe reader</Text>
            <Text style={styles.readerStatus}>
              {connectedReader
                ? `Connected · ${connectedReader.label || connectedReader.serialNumber}`
                : connectionStatus === "discovering"
                  ? "Looking nearby…"
                  : "Not connected"}
            </Text>
          </View>
          <View
            style={[
              styles.readerDot,
              connectedReader && styles.readerDotConnected,
            ]}
          />
        </View>
        {!connectedReader ? (
          <>
            <View style={styles.readerModeRow}>
              {(["simulated", "physical"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setReaderMode(mode);
                    setReaders([]);
                  }}
                  style={[
                    styles.readerMode,
                    readerMode === mode && styles.readerModeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.readerModeText,
                      readerMode === mode && styles.readerModeTextActive,
                    ]}
                  >
                    {mode === "simulated" ? "Simulated reader" : "Physical reader"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={findReader}
              disabled={readerBusy}
              style={[styles.primary, readerBusy && styles.primaryDisabled]}
            >
              <Text style={styles.primaryText}>
                {readerBusy ? "Preparing scan…" : "Find test reader"}
              </Text>
            </Pressable>
            {readers.map((reader) => (
              <Pressable
                key={reader.id || reader.serialNumber}
                onPress={() => connectToReader(reader)}
                style={styles.readerChoice}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.readerChoiceTitle}>
                    {reader.simulated ? "Stripe simulated reader" : reader.label || "Stripe reader"}
                  </Text>
                  <Text style={styles.readerChoiceMeta}>
                    {reader.deviceType} · {reader.serialNumber}
                  </Text>
                </View>
                <Text style={styles.readerChoiceAction}>Connect ›</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <Pressable
            onPress={() => disconnectReader()}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Disconnect reader</Text>
          </Pressable>
        )}
      </View>
      {message ? <Text style={styles.successText}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Products</Text>
        <Pressable onPress={refreshProducts}>
          <Text style={styles.listCount}>Refresh stock</Text>
        </Pressable>
      </View>
      {loadingProducts ? (
        <ActivityIndicator color={colors.terracotta} />
      ) : (
        products.map((product) => {
          const quantity = cart[product.sku] || 0;
          return (
            <View key={product.sku} style={styles.registerProduct}>
              <Image
                source={{ uri: `${API_URL}${product.image}` }}
                style={styles.registerProductImage}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.registerProductTitle}>{product.name}</Text>
                <Text style={styles.registerProductMeta}>
                  {eventMoney(product.unitPriceCents)} · {product.stock} in test stock
                </Text>
              </View>
              <View style={styles.quantityControl}>
                <Pressable
                  onPress={() => changeQuantity(product, -1)}
                  disabled={!quantity}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <Pressable
                  onPress={() => changeQuantity(product, 1)}
                  disabled={quantity >= product.stock}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>＋</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
      <View style={styles.registerCart}>
        <Text style={styles.eyebrow}>CURRENT TEST SALE</Text>
        {cartItems.length ? (
          cartItems.map((item) => {
            const product = products.find((candidate) => candidate.sku === item.sku)!;
            return (
              <View key={item.sku} style={styles.cartLine}>
                <Text style={styles.cartLineName}>
                  {item.quantity} × {product.name}
                </Text>
                <Text style={styles.cartLineAmount}>
                  {eventMoney(product.unitPriceCents * item.quantity)}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.calendarNoticeCopy}>Add a product to begin.</Text>
        )}
        <View style={styles.cartTotal}>
          <Text style={styles.cartTotalLabel}>Subtotal before server tax</Text>
          <Text style={styles.cartTotalAmount}>{eventMoney(subtotal)}</Text>
        </View>
        <Pressable
          onPress={checkout}
          disabled={checkoutBusy || !cartItems.length || !connectedReader}
          style={[
            styles.registerCheckout,
            (checkoutBusy || !cartItems.length || !connectedReader) &&
              styles.primaryDisabled,
          ]}
        >
          <Text style={styles.registerCheckoutText}>
            {checkoutBusy ? "Completing Stripe test…" : "Take test payment"}
          </Text>
        </Pressable>
        <Text style={styles.registerSafety}>
          Backend-enforced test mode. Use Stripe’s simulated reader or an
          approved Stripe test card only—never a customer’s real card.
        </Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [account, setAccount] = useState<SignedInAccount | null>(null),
    [restoring, setRestoring] = useState(true),
    [tab, setTab] = useState<Tab>("Today"),
    [seeds, setSeeds] = useState<ContentSeed[]>([]),
    [adventures, setAdventures] = useState<SharedAdventure[]>([]),
    [media, setMedia] = useState<SharedMediaAsset[]>([]),
    [creatingAdventure, setCreatingAdventure] = useState(false),
    [viewingPreviews, setViewingPreviews] = useState(false),
    [viewingCalendar, setViewingCalendar] = useState(false),
    [teamOpen, setTeamOpen] = useState(false),
    [adaptation, setAdaptation] = useState<JournalAdaptation>(),
    [initialInstagramPostId, setInitialInstagramPostId] = useState<string>(),
    [initialJournalStorySlug, setInitialJournalStorySlug] = useState<string>(),
    [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    SecureStore.getItemAsync(APP_SESSION_KEY)
      .then(async (saved) => {
        if (!saved) return;
        const locked = await SecureStore.getItemAsync(DEVICE_LOCK_KEY);
        if (locked === "on") {
          const check = await LocalAuthentication.authenticateAsync({
            promptMessage: "Open Nomadic Paws",
            fallbackLabel: "Use iPhone Passcode",
            disableDeviceFallback: false,
          });
          if (!check.success) return;
        }
        const stored = JSON.parse(saved) as SignedInAccount;
        try {
          const restored = await restoreAppSession(stored.token);
          setAccount({ token: stored.token, user: restored.user });
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : "";
          if (/network|offline|internet|fetch/i.test(message)) {
            setAccount(stored);
            return;
          }
          await SecureStore.deleteItemAsync(APP_SESSION_KEY);
        }
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);
  async function signedIn(next: SignedInAccount) {
    await SecureStore.setItemAsync(APP_SESSION_KEY, JSON.stringify(next));
    setAccount(next);
  }
  async function signedOut() {
    if (account) await signOutApp(account.token).catch(() => {});
    await SecureStore.deleteItemAsync(APP_SESSION_KEY);
    setAccount(null);
    setTeamOpen(false);
  }
  async function refreshShared() {
    if (!account || account.user.role === "mom") return;
    const shared = await loadSharedMedia(account.token);
    setAdventures(shared.adventures);
    setMedia(shared.media);
    setSeeds(
      shared.adventures.map((item) => ({
        id: item.id,
        title: item.title,
        note: item.notes || "A shared Nomadic Paws adventure.",
        capturedAt: new Date(`${item.captured_at}T12:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" },
        ),
        assignedTo: item.assigned_to,
        status: item.status,
        platforms: item.platforms.filter(
          (platform): platform is ContentSeed["platforms"][number] =>
            [
              "Trail Journal",
              "Instagram",
              "Pinterest",
              "TikTok",
              "YouTube Shorts",
            ].includes(platform),
        ),
        mediaCount: item.media_count,
        privateLocation: item.private_location || undefined,
        publicLocation: item.public_location || undefined,
      })),
    );
  }
  function beginJournalAdaptation(next: JournalAdaptation) {
    setAdaptation(next);
    setTeamOpen(false);
    setCreatingAdventure(false);
    setViewingPreviews(false);
    setViewingCalendar(false);
    setTab(
      next.platform === "Pinterest"
        ? "Pinterest"
        : next.platform === "Instagram"
          ? "Studio"
          : "Video",
    );
  }
  function openInstagramPost(postId: string) {
    setInitialInstagramPostId(postId);
    setTeamOpen(false);
    setCreatingAdventure(false);
    setViewingPreviews(false);
    setViewingCalendar(false);
    setAdaptation(undefined);
    setTab("Studio");
  }
  function openJournalStory(slug: string) {
    setInitialJournalStorySlug(slug);
    setTeamOpen(false);
    setCreatingAdventure(false);
    setViewingPreviews(false);
    setViewingCalendar(false);
    setAdaptation(undefined);
    setTab("Journal");
  }
  useEffect(() => {
    refreshShared().catch(() => {});
  }, [account?.token, account?.user.role]);
  if (restoring)
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.terracotta} />
        <Text style={styles.helper}>Opening your workspace…</Text>
      </View>
    );
  if (!account) return <Login onSignedIn={signedIn} />;
  const token = account.token;
  const person: Person =
    account.user.role === "trinitie"
      ? "Trinitie"
      : account.user.role === "mom"
        ? "Mom"
        : "Katie";
  const content = teamOpen ? (
    <TeamAccess token={token} onSignOut={signedOut} />
  ) : viewingPreviews ? (
    <SharedPreviews
      token={token}
      person={person}
      onClose={() => setViewingPreviews(false)}
      onOpenInstagramPost={openInstagramPost}
      onOpenJournalStory={openJournalStory}
    />
  ) : viewingCalendar ? (
    <ContentCalendar
      token={token}
      person={person}
      onClose={() => setViewingCalendar(false)}
    />
  ) : creatingAdventure ? (
    <NewAdventure
      token={token}
      onCancel={() => setCreatingAdventure(false)}
      onSaved={() => {
        setCreatingAdventure(false);
        refreshShared().catch(() => {});
      }}
    />
  ) : tab === "Today" ? (
    <Today
      token={token}
      person={person}
      seeds={seeds}
      onNewAdventure={() => setCreatingAdventure(true)}
      onOpenPreviews={() => setViewingPreviews(true)}
      onOpenCalendar={() => setViewingCalendar(true)}
      onOpenInstagramPost={openInstagramPost}
      onOpenJournalStory={openJournalStory}
    />
  ) : tab === "Media" ? (
    <MediaLibrary
      token={token}
      adventures={adventures}
      media={media}
      onUpdated={(updated) =>
        setMedia((current) =>
          current.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item,
          ),
        )
      }
      onWorkingSaved={() => refreshShared().catch(() => {})}
    />
  ) : tab === "Studio" ? (
    person !== "Mom" ? (
      <InstagramStudio
        token={token}
        person={person}
        seeds={seeds.filter((seed) => seed.platforms.includes("Instagram"))}
        onOpenPreviews={() => setViewingPreviews(true)}
        initialArticle={
          adaptation?.platform === "Instagram" ? adaptation : undefined
        }
        onInitialArticleOpened={() => setAdaptation(undefined)}
        initialPostId={initialInstagramPostId}
        onInitialPostOpened={() => setInitialInstagramPostId(undefined)}
      />
    ) : (
      <Studio seeds={seeds} />
    )
  ) : tab === "Video" ? (
    <VideoStudio
      token={token}
      person={person}
      media={media}
      initialArticle={
        adaptation &&
        ["TikTok", "YouTube Shorts"].includes(adaptation.platform)
          ? adaptation
          : undefined
      }
      onInitialArticleOpened={() => setAdaptation(undefined)}
    />
  ) : tab === "Journal" ? (
    <Journal
      token={token}
      person={person}
      onAdapt={beginJournalAdaptation}
      initialStorySlug={initialJournalStorySlug}
      onInitialStoryOpened={() => setInitialJournalStorySlug(undefined)}
    />
  ) : (
    <Pinterest
      token={token}
      initialStorySlug={
        adaptation?.platform === "Pinterest" ? adaptation.slug : undefined
      }
      onInitialStoryOpened={() => setAdaptation(undefined)}
    />
  );
  const tabs: Tab[] =
    person === "Trinitie"
      ? ["Today", "Media", "Studio", "Video", "Journal"]
      : person === "Mom"
        ? ["Today", "Journal"]
        : ["Today", "Media", "Studio", "Video", "Journal", "Pinterest"];
  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.appHeader}>
        <Image
          source={require("./assets/icon.png")}
          style={styles.headerLogo}
        />
        <View>
          <Text style={styles.appName}>Nomadic Paws</Text>
          <Text style={styles.appSubtitle}>
            {person === "Trinitie"
              ? "Instagram Studio"
              : person === "Mom"
                ? "Trail Journal Review"
                : "Creative & Publishing"}
          </Text>
        </View>
        {person === "Katie" ? (
          <Pressable
            onPress={() => {
              setTeamOpen((value) => !value);
              setCreatingAdventure(false);
              setViewingPreviews(false);
              setViewingCalendar(false);
            }}
            style={styles.teamHeaderButton}
          >
            <Text style={styles.teamHeaderText}>
              {teamOpen ? "Studio" : "Team"}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <KeyboardAvoidingView
        style={styles.appBody}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
      {content}
      <View style={styles.tabs}>
        {tabs.map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setTeamOpen(false);
              setCreatingAdventure(false);
              setViewingPreviews(false);
              setViewingCalendar(false);
              setAdaptation(undefined);
              setInitialInstagramPostId(undefined);
              setInitialJournalStorySlug(undefined);
              setTab(item);
            }}
            style={styles.tab}
          >
            <Text
              style={[styles.tabText, tab === item && styles.tabTextActive]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      </KeyboardAvoidingView>
      {keyboardHeight ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hide keyboard"
          onPress={Keyboard.dismiss}
          style={[styles.floatingKeyboardDone, { bottom: keyboardHeight + 10 }]}
        >
          <Text style={styles.keyboardDoneText}>Done</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  journalMediaRow: { gap: 10, paddingVertical: 8, paddingRight: 12 },
  journalMediaCard: {
    width: 150,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    overflow: "hidden",
  },
  journalMediaImage: {
    width: "100%",
    height: 130,
    backgroundColor: colors.sand,
  },
  journalMediaAction: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sageDeep,
  },
  journalMediaActionText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.white,
  },
  journalMediaActionSecondary: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.sandDeep,
  },
  journalMediaActionTextSecondary: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  appleButton: { width: "100%", height: 56, marginBottom: 14 },
  teamHeaderButton: {
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  teamHeaderText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  teamCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  teamName: { fontSize: 19, fontWeight: "900", color: colors.bark },
  teamEmail: { fontSize: 12, color: colors.barkSoft, marginTop: 4 },
  teamActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  teamButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.sageDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  teamButtonText: { fontSize: 13, fontWeight: "900", color: colors.white },
  teamEmpty: {
    backgroundColor: "#f0f3ec",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  teamEmptyTitle: { fontSize: 17, fontWeight: "900", color: colors.bark },
  teamEmptyCopy: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.barkSoft,
    marginTop: 5,
  },
  deviceLock: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deviceLockState: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  selectedFile: {
    minHeight: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.bark,
  },
  selectedVideoIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedVideoIconText: {
    color: colors.terracottaDeep,
    fontSize: 12,
    fontWeight: "900",
  },
  removeFile: { fontSize: 11, fontWeight: "900", color: colors.terracottaDeep },
  uploadedFile: { fontSize: 11, fontWeight: "900", color: colors.sageDeep },
  shareButton: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: colors.terracotta,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  mediaGroup: { marginTop: 22 },
  mediaGroupHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  mediaGroupTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    color: colors.bark,
  },
  mediaGroupMeta: { fontSize: 11, color: colors.barkSoft, marginTop: 3 },
  mediaGroupState: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.sageDeep,
    backgroundColor: "#eef2e9",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mediaCard: {
    width: "48%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.sand },
  mediaVideoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaVideoPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    paddingTop: 13,
    paddingLeft: 3,
    backgroundColor: colors.terracotta,
    color: colors.white,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
  },
  mediaVideoLabel: {
    color: colors.barkSoft,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  mediaBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(63,53,42,.84)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  mediaBadgeText: { fontSize: 9, fontWeight: "900", color: colors.white },
  mediaInfo: { padding: 10 },
  mediaAdventure: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    color: colors.bark,
  },
  mediaName: { fontSize: 10, color: colors.barkSoft },
  mediaTagsLine: {
    fontSize: 9,
    color: colors.sageDeep,
    fontWeight: "800",
    marginTop: 4,
  },
  prepareButton: {
    minHeight: 38,
    borderTopWidth: 1,
    borderTopColor: colors.sandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  prepareButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  mediaModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(31,25,19,.72)",
    justifyContent: "center",
    padding: 18,
  },
  mediaModal: {
    backgroundColor: colors.cream,
    borderRadius: 24,
    overflow: "hidden",
  },
  mediaModalImage: { width: "100%", height: 360, backgroundColor: "#211d18" },
  mediaModalBody: { padding: 18 },
  mediaModalTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    color: colors.bark,
  },
  mediaModalFile: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.barkSoft,
    marginTop: 6,
  },
  mediaModalNote: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.sageDeep,
    fontWeight: "700",
    marginTop: 12,
  },
  workingModal: { flex: 1, backgroundColor: colors.cream },
  workingModalPage: { padding: 20, paddingBottom: 60 },
  workingEditor: { marginTop: 22 },
  workingTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: colors.bark,
    marginBottom: 12,
  },
  workingPreview: {
    width: "100%",
    maxHeight: 480,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: colors.sand,
    position: "relative",
    marginVertical: 14,
  },
  workingPhoto: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: "125%",
  },
  filterStrip: { gap: 10, paddingBottom: 14 },
  filterChoice: {
    width: 82,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 14,
    padding: 4,
  },
  filterChoiceActive: { borderColor: colors.terracotta },
  filterPreview: {
    width: 70,
    height: 88,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.sand,
  },
  filterPhoto: { width: "100%", height: "100%" },
  filterLogo: {
    position: "absolute",
    width: 24,
    height: 24,
    left: 5,
    bottom: 4,
  },
  filterName: {
    color: colors.bark,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
  },
  shell: { flex: 1, backgroundColor: colors.cream },
  appBody: { flex: 1 },
  loginKeyboard: { flex: 1, backgroundColor: colors.cream },
  login: { flex: 1, backgroundColor: colors.cream },
  loginContent: {
    flexGrow: 1,
    padding: 28,
    justifyContent: "center",
    paddingBottom: 40,
  },
  loginLogo: { width: 92, height: 92, borderRadius: 28, marginBottom: 24 },
  keyboardBar: {
    minHeight: 48,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.sandDeep,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  keyboardDone: {
    minHeight: 40,
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardDoneText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.terracottaDeep,
  },
  floatingKeyboardDone: {
    position: "absolute",
    right: 14,
    zIndex: 40,
    minHeight: 42,
    minWidth: 72,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.bark,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  eyebrow: {
    color: colors.sageDeep,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    color: colors.bark,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: colors.bark,
    marginBottom: 10,
  },
  copy: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.barkSoft,
    marginBottom: 22,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.bark,
    marginBottom: 12,
  },
  primary: {
    backgroundColor: colors.terracotta,
    borderRadius: 16,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  primaryText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  error: { color: "#a13d3d", lineHeight: 22, marginBottom: 12 },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  retryCard: {
    backgroundColor: "#fff7f4",
    borderWidth: 1,
    borderColor: "#e4b8a5",
    borderRadius: 16,
    padding: 14,
    marginVertical: 12,
  },
  emptyTodayCard: {
    backgroundColor: "#f3f6ef",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  emptyTodayTitle: { color: colors.bark, fontSize: 17, fontWeight: "900" },
  emptyTodayCopy: { color: colors.barkSoft, fontSize: 13, lineHeight: 20, marginTop: 6 },
  appHeader: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.sandDeep,
    backgroundColor: colors.white,
  },
  headerLogo: { width: 40, height: 40, borderRadius: 12, marginRight: 11 },
  appName: { fontSize: 17, fontWeight: "800", color: colors.bark },
  appSubtitle: { fontSize: 12, color: colors.barkSoft },
  page: { padding: 20, paddingBottom: 120 },
  section: { marginVertical: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.sageDeep,
    marginBottom: 8,
  },
  selectedStory: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  change: { color: colors.terracottaDeep, fontWeight: "800", marginLeft: 12 },
  storyList: { gap: 10 },
  storyRow: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    padding: 16,
    minHeight: 72,
    justifyContent: "center",
  },
  storyRowSelected: {
    borderColor: colors.terracotta,
    backgroundColor: "#fff8f3",
  },
  storyTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
    color: colors.bark,
  },
  storyMeta: { fontSize: 13, color: colors.barkSoft, marginTop: 5 },
  pinCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    padding: 14,
    marginTop: 18,
  },
  pinHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  pinTitle: { fontSize: 21, fontWeight: "800", color: colors.bark },
  pinTiming: { fontSize: 12, color: colors.barkSoft },
  preview: {
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.sand,
    position: "relative",
    marginBottom: 12,
  },
  previewPhoto: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  previewFocusTop: { transform: [{ translateY: 18 }, { scale: 1.12 }] },
  previewFocusBottom: { transform: [{ translateY: -18 }, { scale: 1.12 }] },
  pinDirectUpload: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.terracotta,
    backgroundColor: "#fff8f3",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  pinDirectUploadText: {
    color: colors.terracottaDeep,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  pinMediaRow: { gap: 9, paddingBottom: 14 },
  pinMediaChoice: {
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 13,
    padding: 3,
  },
  pinMediaChoiceActive: { borderColor: colors.terracotta },
  pinMediaThumb: {
    width: 70,
    height: 88,
    borderRadius: 9,
    backgroundColor: colors.sand,
  },
  retroactiveChoice: {
    flexDirection: "row",
    gap: 11,
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  retroactiveCheck: { color: colors.terracotta, fontSize: 22, fontWeight: "900" },
  retroactiveTitle: { color: colors.bark, fontSize: 15, fontWeight: "900" },
  retroactiveCopy: { color: colors.barkSoft, fontSize: 12, lineHeight: 18, marginTop: 3 },
  emptyPreview: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyIcon: { fontSize: 34, color: colors.terracotta },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.barkSoft,
    marginTop: 5,
  },
  previewLogo: { position: "absolute", bottom: "4%", height: 80 },
  logoSmall: { width: "23%" },
  logoMedium: { width: "31%" },
  logoLeft: { left: "6%" },
  logoRight: { right: "6%" },
  controlLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.bark,
    marginTop: 8,
    marginBottom: 7,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: colors.white,
  },
  choiceSelected: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  choiceText: { color: colors.bark, fontWeight: "700", fontSize: 13 },
  choiceTextSelected: { color: colors.white },
  helper: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.barkSoft,
    textAlign: "center",
    marginTop: 10,
  },
  tabs: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.sandDeep,
    flexDirection: "row",
    paddingBottom: 8,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 11, fontWeight: "700", color: colors.barkSoft },
  tabTextActive: { color: colors.terracottaDeep },
  todayHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  calendarButton: {
    minWidth: 70,
    minHeight: 62,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarButtonDay: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  calendarButtonLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.barkSoft,
  },
  calendarLoading: { paddingVertical: 50, alignItems: "center" },
  calendarDay: { marginTop: 21 },
  calendarDate: {
    marginBottom: 9,
    fontSize: 13,
    fontWeight: "900",
    color: colors.bark,
  },
  calendarItem: {
    flexDirection: "row",
    gap: 11,
    marginBottom: 9,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
  },
  calendarMarker: { width: 5, borderRadius: 999 },
  calendarMarkerJournal: { backgroundColor: colors.terracotta },
  calendarMarkerInstagram: { backgroundColor: colors.sageDeep },
  calendarMarkerPinterest: { backgroundColor: colors.barkSoft },
  calendarItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 9,
  },
  calendarPlatform: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.terracottaDeep,
  },
  calendarStatus: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.sageDeep,
  },
  calendarTitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    color: colors.bark,
  },
  calendarDetail: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.barkSoft,
  },
  calendarNotice: {
    marginTop: 18,
    padding: 17,
    borderRadius: 18,
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.sandDeep,
  },
  calendarNoticeTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.bark,
  },
  calendarNoticeCopy: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: colors.barkSoft,
  },
  roleSwitch: {
    flexDirection: "row",
    backgroundColor: colors.sand,
    borderRadius: 999,
    padding: 3,
  },
  roleButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  roleButtonActive: { backgroundColor: colors.bark },
  roleText: { fontSize: 12, fontWeight: "800", color: colors.barkSoft },
  roleTextActive: { color: colors.white },
  adventureButton: {
    backgroundColor: colors.bark,
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 132,
  },
  adventureEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: "#d9c9ae",
    marginBottom: 7,
  },
  adventureTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 6,
  },
  adventureCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#e9dfd1",
    maxWidth: 260,
  },
  adventurePlus: { fontSize: 38, color: colors.white, marginLeft: "auto" },
  newStoryButton: {
    backgroundColor: colors.sageDeep,
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 126,
  },
  newStoryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  newStoryTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: colors.bark,
    marginBottom: 8,
  },
  readinessRow: { flexDirection: "row", gap: 9, marginBottom: 26 },
  readinessCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 13,
    minHeight: 86,
    justifyContent: "center",
  },
  readinessCardActive: {
    borderColor: colors.terracotta,
    backgroundColor: "#fffaf6",
  },
  readinessNumber: {
    fontSize: 23,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  readinessLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: colors.barkSoft,
    marginTop: 4,
  },
  listHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  listTitle: { fontSize: 22, fontWeight: "800", color: colors.bark },
  listCount: { fontSize: 12, fontWeight: "700", color: colors.barkSoft },
  seedCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 19,
    padding: 16,
    marginBottom: 12,
  },
  seedTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },
  seedStatus: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  seedStatusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  seedOwner: { fontSize: 12, fontWeight: "800", color: colors.barkSoft },
  seedTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.bark,
  },
  seedNote: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.barkSoft,
    marginTop: 6,
  },
  seedMeta: { flexDirection: "row", gap: 14, marginTop: 12 },
  seedMetaText: { fontSize: 12, fontWeight: "700", color: colors.sageDeep },
  platforms: { gap: 6, paddingTop: 12 },
  platformPill: {
    backgroundColor: colors.sand,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  platformText: { fontSize: 10, fontWeight: "800", color: colors.barkSoft },
  gentleNote: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.barkSoft,
    textAlign: "center",
    paddingHorizontal: 18,
    marginTop: 8,
  },
  notesInput: { minHeight: 118, paddingTop: 14, textAlignVertical: "top" },
  uploadWell: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.sage,
    borderRadius: 18,
    backgroundColor: "#f7f8f3",
    padding: 22,
    alignItems: "center",
    marginVertical: 8,
  },
  uploadIcon: { fontSize: 31, color: colors.sageDeep },
  uploadTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.bark,
    marginTop: 7,
  },
  uploadCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.barkSoft,
    textAlign: "center",
    marginTop: 5,
  },
  primaryDisabled: { opacity: 0.45 },
  secondary: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryText: { fontSize: 15, fontWeight: "800", color: colors.barkSoft },
  studioBanner: {
    backgroundColor: "#e8eee2",
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  studioBannerTitle: { fontSize: 21, fontWeight: "900", color: colors.bark },
  studioBannerCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.barkSoft,
    marginTop: 6,
  },
  assistantButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.sageDeep,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 13,
  },
  assistantButtonText: { fontSize: 13, fontWeight: "800", color: colors.white },
  assistantInlineButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  assistantInlineButtonText: {
    color: colors.bark,
    fontSize: 12,
    fontWeight: "900",
  },
  assistantSuggestion: {
    backgroundColor: "#eef2e8",
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: 17,
    padding: 14,
    marginBottom: 15,
  },
  assistantSuggestionLabel: {
    color: colors.sageDeep,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  assistantSuggestionCaption: {
    color: colors.bark,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 10,
  },
  assistantHashtagRow: { marginTop: 7 },
  assistantHashtag: {
    color: colors.terracottaDeep,
    fontSize: 12,
    fontWeight: "900",
  },
  assistantHashtagReason: {
    color: colors.barkSoft,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },
  assistantUseButton: {
    backgroundColor: colors.bark,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginTop: 13,
  },
  assistantUseButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  uploadReminder: {
    backgroundColor: "#f7f1e8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    padding: 14,
    marginTop: -6,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadReminderTitle: { fontSize: 14, fontWeight: "800", color: colors.bark },
  uploadReminderCopy: { fontSize: 12, color: colors.barkSoft, marginTop: 3 },
  uploadReminderAction: {
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  uploadReminderActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.terracottaDeep,
  },
  trinitieFocus: {
    backgroundColor: "#f0f3ec",
    borderRadius: 18,
    padding: 17,
    marginBottom: 18,
  },
  trinitieFocusTitle: { fontSize: 16, fontWeight: "800", color: colors.bark },
  trinitieFocusCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.barkSoft,
    marginTop: 5,
  },
  backButton: { alignSelf: "flex-start", paddingVertical: 8, marginBottom: 6 },
  backText: { fontSize: 15, fontWeight: "800", color: colors.terracottaDeep },
  previewShareCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },
  previewShareTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 11,
  },
  previewPlatform: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: colors.sageDeep,
    textTransform: "uppercase",
  },
  previewVersion: { fontSize: 11, color: colors.barkSoft, marginTop: 4 },
  previewCreator: { fontSize: 12, fontWeight: "800", color: colors.barkSoft },
  previewShareImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 14,
    backgroundColor: colors.sand,
  },
  previewShareTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    color: colors.bark,
    marginTop: 14,
  },
  previewCaption: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.barkSoft,
    marginTop: 6,
  },
  previewDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  previewDetail: {
    backgroundColor: colors.sand,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: "800",
    color: colors.barkSoft,
  },
  reactionRow: { flexDirection: "row", gap: 7, marginTop: 14 },
  reactionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  reactionButtonActive: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  reactionText: { fontSize: 11, fontWeight: "800", color: colors.barkSoft },
  reactionTextActive: { color: colors.white },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    padding: 24,
  },
  journalList: { gap: 10 },
  journalRow: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 112,
  },
  journalStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  journalStatus: {
    alignSelf: "flex-start",
    backgroundColor: "#f7e6dc",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 8,
  },
  journalStatusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.terracottaDeep,
  },
  journalDate: { fontSize: 12, fontWeight: "700", color: colors.barkSoft },
  journalArrow: { fontSize: 30, color: colors.terracotta, marginLeft: 10 },
  articlePaper: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 20,
    padding: 20,
  },
  articleHeading: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    color: colors.bark,
    marginTop: 12,
    marginBottom: 9,
  },
  articleBody: {
    fontSize: 16,
    lineHeight: 27,
    color: colors.bark,
    marginBottom: 15,
  },
  articleQuote: {
    fontSize: 16,
    lineHeight: 26,
    fontStyle: "italic",
    color: colors.sageDeep,
    borderLeftWidth: 3,
    borderLeftColor: colors.terracotta,
    paddingLeft: 14,
    marginVertical: 10,
  },
  reviewSection: { marginTop: 24 },
  reviewNote: {
    backgroundColor: "#f4f6f0",
    borderRadius: 15,
    padding: 14,
    marginTop: 10,
  },
  reviewNoteTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  reviewAuthor: { fontSize: 13, fontWeight: "900", color: colors.bark },
  reviewVersion: { fontSize: 10, fontWeight: "800", color: colors.sageDeep },
  reviewNoteBody: { fontSize: 14, lineHeight: 21, color: colors.barkSoft },
  emptyReview: { fontSize: 14, color: colors.barkSoft, marginVertical: 12 },
  success: {
    color: colors.sageDeep,
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 8,
  },
  instagramReady: {
    backgroundColor: colors.bark,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  instagramReadyNumber: {
    fontSize: 29,
    fontWeight: "900",
    color: colors.white,
  },
  instagramReadyLabel: { fontSize: 12, color: "#e9dfd1", marginTop: 2 },
  instagramPreviewButton: {
    marginLeft: "auto",
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  instagramPreviewButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.bark,
  },
  editLink: { fontSize: 13, fontWeight: "800", color: colors.terracottaDeep },
  templateWelcome: {
    backgroundColor: "#f2ede4",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  templateLibraryRow: { gap: 11, paddingBottom: 12 },
  templateLibraryCard: {
    width: 128,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 8,
  },
  templateLibraryImage: {
    width: 110,
    height: 134,
    borderRadius: 11,
    backgroundColor: colors.bark,
  },
  templateLibraryName: {
    color: colors.bark,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 7,
  },
  templateWelcomeTitle: { fontSize: 21, fontWeight: "900", color: colors.bark },
  templateWelcomeCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.barkSoft,
    marginTop: 7,
  },
  templateButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.terracotta,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 15,
  },
  templateButtonText: { fontSize: 13, fontWeight: "800", color: colors.white },
  laterText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.barkSoft,
    marginTop: 13,
  },
  importMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.sageDeep,
    fontWeight: "700",
    marginTop: 12,
  },
  rhythmCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 19,
    paddingHorizontal: 15,
    marginBottom: 22,
  },
  reminderSetting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f2ede4",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  reminderSettingTitle: {
    color: colors.bark,
    fontSize: 14,
    fontWeight: "900",
  },
  reminderSettingCopy: {
    color: colors.barkSoft,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  reminderSettingState: {
    color: colors.terracotta,
    fontSize: 13,
    fontWeight: "900",
  },
  reminderTimeChoices: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 14,
    marginTop: -4,
    marginBottom: 16,
  },
  rhythmRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  rhythmRowDisabled: { opacity: 0.45 },
  rhythmDay: {
    width: 42,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: colors.terracottaDeep,
    textTransform: "uppercase",
  },
  rhythmTheme: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.bark },
  rhythmInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 15,
    fontWeight: "700",
    color: colors.bark,
    paddingHorizontal: 8,
    backgroundColor: colors.cream,
    borderRadius: 9,
  },
  rhythmToggle: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  rhythmToggleOn: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  rhythmToggleText: { fontSize: 10, fontWeight: "900", color: colors.barkSoft },
  rhythmToggleTextOn: { color: colors.white },
  hashtagRule: {
    backgroundColor: "#e8eee2",
    borderRadius: 18,
    padding: 17,
    marginBottom: 24,
  },
  hashtagTitle: { fontSize: 17, fontWeight: "900", color: colors.bark },
  hashtagCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.barkSoft,
    marginTop: 5,
  },
  instagramDraftEditor: {
    backgroundColor: "#fffaf5",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 20,
    padding: 17,
    marginBottom: 24,
  },
  localSaveState: {
    marginTop: -8,
    marginBottom: 14,
    fontSize: 11,
    fontWeight: "800",
    color: colors.sageDeep,
  },
  helperCopy: {
    color: colors.barkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  instagramMediaRow: {
    gap: 10,
    paddingBottom: 14,
  },
  instagramMediaCard: {
    width: 112,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 15,
    padding: 7,
  },
  instagramMediaThumb: {
    width: 96,
    height: 112,
    borderRadius: 11,
    backgroundColor: colors.sand,
  },
  instagramMediaName: {
    color: colors.bark,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 7,
    minHeight: 30,
  },
  instagramMediaDimensions: {
    color: colors.barkSoft,
    fontSize: 10,
    marginTop: 2,
  },
  instagramMediaAdd: {
    color: colors.terracotta,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  instagramSelectedCard: {
    width: 118,
    position: "relative",
  },
  instagramSelectedThumb: {
    width: 118,
    height: 148,
    borderRadius: 14,
    backgroundColor: colors.sand,
  },
  instagramSelectedNumber: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.bark,
    color: colors.white,
    textAlign: "center",
    lineHeight: 25,
    fontWeight: "900",
  },
  instagramRemove: {
    color: colors.terracotta,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 8,
  },
  instagramHandoffButton: {
    backgroundColor: colors.bark,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  instagramHandoffButtonText: {
    color: colors.white,
    fontWeight: "900",
    textAlign: "center",
  },
  studioWelcomeBackdrop: {
    flex: 1,
    backgroundColor: "rgba(48, 34, 25, 0.72)",
    justifyContent: "center",
    padding: 24,
  },
  studioWelcomeCard: {
    backgroundColor: colors.cream,
    borderRadius: 26,
    padding: 18,
  },
  studioWelcomeImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 18,
    backgroundColor: colors.sand,
  },
  studioWelcomeTitle: {
    color: colors.bark,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 18,
  },
  studioWelcomeCopy: {
    color: colors.barkSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5,
    marginBottom: 8,
  },
  successText: {
    color: "#2f6b45",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 8,
  },
  publishButton: {
    backgroundColor: colors.terracottaDeep,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginTop: 11,
  },
  publishButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  preparedPost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 17,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  preparedPostStatus: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.sageDeep,
  },
  preparedPostTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.bark,
    marginTop: 5,
  },
  preparedPostMeta: { fontSize: 12, color: colors.barkSoft, marginTop: 5 },
  emptyPosts: {
    backgroundColor: "#f4f0e8",
    borderRadius: 17,
    padding: 17,
    marginBottom: 22,
  },
  emptyPostsTitle: { fontSize: 15, fontWeight: "900", color: colors.bark },
  emptyPostsCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.barkSoft,
    marginTop: 5,
  },
  syncMessage: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.sageDeep,
    marginTop: -12,
    marginBottom: 18,
  },
  editorShell: { flex: 1, backgroundColor: colors.cream },
  editorTop: {
    height: 50,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  saveState: { flexDirection: "row", alignItems: "center", gap: 6 },
  saveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.terracotta,
  },
  saveDotSynced: { backgroundColor: colors.sageDeep },
  saveStateText: { fontSize: 11, fontWeight: "800", color: colors.barkSoft },
  editorTabsScroller: { flexGrow: 0, minHeight: 58 },
  editorTabs: {
    paddingHorizontal: 18,
    gap: 7,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: "center",
  },
  editorTab: {
    borderRadius: 999,
    paddingHorizontal: 16,
    minWidth: 82,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
  },
  editorTabActive: { backgroundColor: colors.bark, borderColor: colors.bark },
  editorTabText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.barkSoft,
    textAlign: "center",
  },
  editorTabTextActive: { color: colors.white },
  editorPage: { padding: 20, paddingBottom: 130 },
  editorTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "900",
    color: colors.bark,
    padding: 0,
    marginBottom: 12,
  },
  editorExcerpt: {
    fontSize: 17,
    lineHeight: 25,
    color: colors.barkSoft,
    padding: 0,
    marginBottom: 18,
  },
  editorToolbar: {
    gap: 8,
    paddingBottom: 12,
  },
  editorTool: {
    minWidth: 44,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  editorToolText: {
    color: colors.bark,
    fontSize: 14,
    fontWeight: "700",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 20,
  },
  categoryChoice: {
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  categoryChoiceActive: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  categoryChoiceText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.barkSoft,
  },
  categoryChoiceTextActive: { color: colors.white },
  editorBody: {
    minHeight: 600,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 20,
    padding: 19,
    fontSize: 17,
    lineHeight: 29,
    color: colors.bark,
  },
  wordCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.barkSoft,
    textAlign: "right",
    marginTop: 8,
  },
  heroEditor: {
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.sand,
    marginBottom: 18,
  },
  heroEditorImage: { width: "100%", height: "100%" },
  heroEditorEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  photoFuture: { backgroundColor: "#f0f3ec", borderRadius: 17, padding: 17 },
  photoFutureTitle: { fontSize: 17, fontWeight: "900", color: colors.bark },
  photoFutureCopy: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.barkSoft,
    marginTop: 5,
  },
  socialAdapt: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 17,
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
    marginBottom: 9,
  },
  socialAdaptTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.bark,
    flexShrink: 1,
  },
  socialAdaptActionRow: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  socialAdaptAction: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    color: colors.terracottaDeep,
  },
  socialAdaptChevron: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.terracottaDeep,
  },
  publishChecks: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 19,
    paddingHorizontal: 15,
    marginBottom: 22,
  },
  publishCheck: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  publishCheckIcon: { fontSize: 17, fontWeight: "900", width: 28 },
  checkOkay: { color: colors.sageDeep },
  checkMissing: { color: colors.terracotta },
  publishCheckLabel: { fontSize: 14, fontWeight: "800", color: colors.bark },
  publishCheckState: {
    marginLeft: "auto",
    fontSize: 11,
    color: colors.barkSoft,
  },
  journalAddressPreview: {
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 16,
  },
  journalAddressLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.sageDeep,
    marginBottom: 4,
  },
  journalAddressValue: { fontSize: 12, lineHeight: 18, fontWeight: "800", color: colors.terracottaDeep, marginBottom: 12 },
  journalAddressFile: { fontSize: 11, lineHeight: 17, color: colors.bark, marginBottom: 9 },
  journalAddressHelp: { fontSize: 10, lineHeight: 16, color: colors.barkSoft },
  syncLadder: {
    backgroundColor: colors.bark,
    borderRadius: 18,
    padding: 17,
    marginVertical: 12,
  },
  syncLadderTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.white,
    marginBottom: 9,
  },
  syncLadderItem: { fontSize: 13, lineHeight: 24, color: "#e9dfd1" },
  versionHint: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.sageDeep,
    textAlign: "center",
    marginTop: 10,
  },
  reviewAnchorSelected: {
    backgroundColor: "#f4eee1",
    borderLeftWidth: 3,
    borderLeftColor: colors.terracotta,
    borderRadius: 10,
    paddingHorizontal: 9,
  },
  anchorComposer: {
    backgroundColor: "#fffaf3",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },
  reviewHandoffCard: {
    backgroundColor: "#fffaf3",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    gap: 10,
  },
  reviewHandoffTitle: { fontSize: 18, fontWeight: "900", color: colors.bark },
  reviewHandoffCopy: { fontSize: 13, lineHeight: 20, color: colors.barkSoft },
  reviewResponseCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 14,
    padding: 13,
    gap: 8,
  },
  reviewModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(63,53,42,0.38)",
  },
  reviewModalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    maxHeight: "78%",
  },
  reviewConfirmCard: {
    margin: 22,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  reviewModalCancel: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  reviewModalCancelText: { fontSize: 14, fontWeight: "800", color: colors.barkSoft },
  reviewFinishPrompt: { marginTop: 22, marginBottom: 9, textAlign: "center", fontSize: 14, fontWeight: "900", color: colors.bark },
  anchorLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.sageDeep,
  },
  anchorQuote: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
    color: colors.barkSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.terracotta,
    paddingLeft: 10,
    marginVertical: 11,
  },
  pendingCount: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.sageDeep,
    textAlign: "center",
    marginTop: 13,
  },
  changedPassage: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  changedLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.sageDeep,
  },
  changedText: {
    fontSize: 16,
    lineHeight: 25,
    color: colors.bark,
    marginVertical: 12,
  },
  resolutionRow: { flexDirection: "row", gap: 8 },
  resolutionButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resolutionActive: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  resolutionText: { fontSize: 12, fontWeight: "800", color: colors.barkSoft },
  resolutionTextActive: { color: colors.white },
  nanaInvite: {
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 19,
    padding: 17,
    marginBottom: 18,
  },
  nanaInviteEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: colors.sageDeep,
  },
  nanaInviteTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.bark,
    marginTop: 5,
  },
  nanaInviteCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.barkSoft,
    marginTop: 5,
  },
  nanaIdeas: { gap: 8, paddingBottom: 18 },
  nanaIdea: {
    width: 240,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 15,
  },
  nanaIdeaText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    color: colors.bark,
  },
  nanaBody: { minHeight: 240, paddingTop: 14 },
  photoBelongsKatie: {
    backgroundColor: "#edf0e8",
    borderRadius: 15,
    padding: 14,
    marginVertical: 6,
  },
  photoBelongsTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.sageDeep,
  },
  photoBelongsCopy: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.barkSoft,
    marginTop: 4,
  },
  contributionSection: { marginBottom: 22 },
  contributionCard: {
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
  },
  contributionStatus: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    color: colors.sageDeep,
  },
  contributionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.bark,
    marginTop: 7,
  },
  contributionBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.barkSoft,
    marginTop: 5,
  },
  contributionPrompts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  contributionPrompt: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: "800",
    color: colors.barkSoft,
  },
  videoProjectSection: {
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 21,
    padding: 16,
    marginBottom: 18,
  },
  videoProjectIntro: { fontSize: 11, lineHeight: 16, color: colors.barkSoft, marginTop: 3 },
  videoNewProjectButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  videoNewProjectText: { fontSize: 12, fontWeight: "900", color: colors.terracottaDeep },
  videoProjectRail: { gap: 9, paddingVertical: 12, paddingRight: 18 },
  videoProjectCard: {
    width: 190,
    minHeight: 116,
    borderRadius: 16,
    padding: 13,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
  },
  videoProjectCardActive: { borderWidth: 2, borderColor: colors.terracotta, padding: 12 },
  videoProjectCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  videoProjectStatus: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase", color: colors.sageDeep },
  videoProjectCheck: { fontSize: 14, fontWeight: "900", color: colors.terracotta },
  videoProjectTitle: { fontSize: 15, lineHeight: 19, fontWeight: "900", color: colors.bark, marginTop: 8 },
  videoProjectMeta: { fontSize: 10, lineHeight: 15, color: colors.barkSoft, marginTop: 7 },
  videoChoiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 3 },
  videoChoice: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  videoChoiceActive: { backgroundColor: colors.bark, borderColor: colors.bark },
  videoChoiceText: { fontSize: 11, fontWeight: "900", color: colors.barkSoft },
  videoChoiceTextActive: { color: colors.white },
  videoPreview: {
    width: "78%",
    maxWidth: 330,
    aspectRatio: 9 / 16,
    alignSelf: "center",
    backgroundColor: colors.bark,
    borderRadius: 25,
    overflow: "hidden",
    position: "relative",
    marginBottom: 14,
    shadowColor: "#3f352a",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  videoPreviewImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    left: "7%",
    right: "7%",
    bottom: "20%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  videoOverlayText: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
    textAlign: "center",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  videoProgress: {
    position: "absolute",
    left: "7%",
    right: "7%",
    bottom: "5%",
    height: 3,
    backgroundColor: "#ffffff66",
    borderRadius: 3,
  },
  videoProgressFill: {
    width: "35%",
    height: 3,
    backgroundColor: colors.white,
    borderRadius: 3,
  },
  videoMeta: { alignItems: "center", marginBottom: 18 },
  videoMetaTitle: { fontSize: 17, fontWeight: "900", color: colors.bark },
  videoMetaCopy: { fontSize: 12, color: colors.barkSoft, marginTop: 4 },
  overlayRail: { gap: 9, paddingVertical: 3, paddingRight: 20 },
  overlayPreset: {
    width: 132,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 9,
  },
  overlayPresetActive: {
    borderColor: colors.terracotta,
    borderWidth: 2,
    padding: 8,
  },
  overlaySwatch: {
    height: 76,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  overlayPresetName: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.bark,
    marginTop: 8,
  },
  overlayPresetAnimation: {
    fontSize: 10,
    color: colors.barkSoft,
    marginTop: 3,
  },
  videoTextInput: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
  fontRail: { gap: 9, paddingVertical: 3, paddingRight: 20 },
  fontChoice: {
    width: 136,
    minHeight: 94,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 11,
    justifyContent: "space-between",
  },
  fontChoiceActive: {
    borderWidth: 2,
    borderColor: colors.terracotta,
    padding: 10,
  },
  fontChoiceSample: { fontSize: 18, lineHeight: 23, color: colors.bark },
  fontChoiceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  fontChoiceName: { fontSize: 10, fontWeight: "800", color: colors.barkSoft },
  fontCheck: { fontSize: 14, fontWeight: "900", color: colors.sageDeep },
  videoPalette: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.sandDeep,
  },
  colorDotSelected: { borderColor: colors.terracotta, borderWidth: 4 },
  overlayTiming: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
  },
  overlayTimingLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: colors.barkSoft,
    textTransform: "uppercase",
  },
  overlayTimeInput: {
    minWidth: 58,
    backgroundColor: colors.sand,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: "900",
    color: colors.bark,
    marginTop: 5,
  },
  overlayTimingTrack: {
    flex: 1,
    height: 7,
    borderRadius: 7,
    backgroundColor: colors.sandDeep,
  },
  overlayTimingFill: {
    marginLeft: "12%",
    width: "55%",
    height: 7,
    borderRadius: 7,
    backgroundColor: colors.terracotta,
  },
  videoTimeline: { marginTop: 25 },
  timelineOverlay: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 8,
  },
  timelineNumber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineOverlayName: { fontSize: 13, fontWeight: "900", color: colors.bark },
  timelineOverlayText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.barkSoft,
    marginTop: 2,
  },
  timelineOverlayTime: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.terracottaDeep,
  },
  videoDraftButton: {
    backgroundColor: colors.sageDeep,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  videoDraftButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  videoExportCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 21,
    padding: 17,
    marginTop: 22,
    marginBottom: 8,
  },
  videoExportTitle: { fontSize: 23, lineHeight: 28, fontWeight: "900", color: colors.bark, marginTop: 4 },
  videoExportCopy: { fontSize: 12, lineHeight: 19, color: colors.barkSoft, marginTop: 7, marginBottom: 14 },
  videoRenderProgressTrack: { height: 9, backgroundColor: colors.sand, borderRadius: 999, overflow: "hidden", marginBottom: 7 },
  videoRenderProgressFill: { height: 9, backgroundColor: colors.terracotta, borderRadius: 999 },
  videoRenderStage: { fontSize: 11, fontWeight: "800", color: colors.sageDeep, marginBottom: 12 },
  videoExportActions: { flexDirection: "row", gap: 9, marginTop: 10 },
  videoExportAction: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 14,
    backgroundColor: "#f7f1e7",
    alignItems: "center",
    justifyContent: "center",
  },
  videoExportActionText: { fontSize: 12, fontWeight: "900", color: colors.terracottaDeep },
  previewPlayButton: {
    width: "78%",
    maxWidth: 330,
    alignSelf: "center",
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 999,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 13,
  },
  previewPlayButtonActive: { borderColor: colors.sage },
  previewPlayIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.terracotta,
    color: colors.white,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "900",
    paddingTop: 6,
  },
  previewPlayText: { fontSize: 13, fontWeight: "900", color: colors.bark },
  clipPicker: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clipPickerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  clipPickerPlus: { fontSize: 24, fontWeight: "900", color: colors.terracotta },
  clipPickerTitle: { fontSize: 14, fontWeight: "900", color: colors.bark },
  clipPickerCopy: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.barkSoft,
    marginTop: 3,
  },
  sharedVideoSection: { marginBottom: 18 },
  sharedVideoRow: { gap: 10, paddingRight: 20, paddingBottom: 2 },
  sharedVideoCard: {
    width: 150,
    minHeight: 112,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 17,
    padding: 13,
  },
  sharedVideoCardActive: {
    borderWidth: 2,
    borderColor: colors.terracotta,
    padding: 12,
  },
  sharedVideoIcon: {
    width: 31,
    height: 31,
    borderRadius: 16,
    paddingTop: 7,
    backgroundColor: colors.sand,
    color: colors.terracottaDeep,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 9,
  },
  sharedVideoName: {
    color: colors.bark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  sharedVideoMeta: {
    color: colors.barkSoft,
    fontSize: 10,
    marginTop: 5,
  },
  registerHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  testModePill: {
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.terracotta,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  testModePillText: {
    color: colors.terracottaDeep,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  readerPanel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 20,
    padding: 16,
    marginVertical: 16,
  },
  readerPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  readerTitle: { color: colors.bark, fontSize: 16, fontWeight: "900" },
  readerStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readerDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.sandDeep,
  },
  readerDotConnected: { backgroundColor: colors.sageDeep },
  readerModeRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  readerMode: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  readerModeActive: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  readerModeText: { color: colors.bark, fontSize: 12, fontWeight: "800" },
  readerModeTextActive: { color: colors.white },
  readerChoice: {
    borderTopWidth: 1,
    borderTopColor: colors.sandDeep,
    paddingTop: 12,
    marginTop: 12,
  },
  readerChoiceTitle: { color: colors.bark, fontSize: 13, fontWeight: "900" },
  readerChoiceMeta: { color: colors.barkSoft, fontSize: 11, marginTop: 3 },
  readerChoiceAction: {
    color: colors.terracottaDeep,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  registerProduct: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  registerProductImage: { width: 58, height: 58, borderRadius: 13 },
  registerProductTitle: { color: colors.bark, fontSize: 14, fontWeight: "900" },
  registerProductMeta: { color: colors.barkSoft, fontSize: 11, marginTop: 4 },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 9 },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: { color: colors.bark, fontSize: 18, fontWeight: "900" },
  quantityValue: { minWidth: 18, textAlign: "center", color: colors.bark, fontWeight: "900" },
  registerCart: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sandDeep,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  cartLine: { flexDirection: "row", justifyContent: "space-between", gap: 14, marginBottom: 8 },
  cartLineName: { flex: 1, color: colors.barkSoft, fontSize: 12 },
  cartLineAmount: { color: colors.bark, fontSize: 12, fontWeight: "800" },
  cartTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.sandDeep,
    paddingTop: 12,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartTotalLabel: { color: colors.bark, fontSize: 14, fontWeight: "900" },
  cartTotalAmount: { color: colors.terracottaDeep, fontSize: 22, fontWeight: "900" },
  registerCheckout: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  registerCheckoutText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  registerSafety: {
    color: colors.barkSoft,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 12,
  },
});
