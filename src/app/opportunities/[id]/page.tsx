"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

const tabs = [
  { key: "JD", label: "Job Description" },
  { key: "EMAIL", label: "Email" },
  { key: "LINKEDIN", label: "LinkedIn" },
  { key: "STUDY", label: "Study" },
  { key: "NOTES", label: "Notes" },
  { key: "CV", label: "CV Builder" },
  { key: "PREP", label: "Prep Tracker" },
  { key: "DOCS", label: "Shared Documents" },
] as const;

const docTags = ["CV", "Cover Letter", "Salary Slip", "Portfolio", "Other"] as const;

type TabKey = (typeof tabs)[number]["key"];

type Opportunity = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  source: string | null;
  status: string;
};

type ContentItem = {
  id: string;
  type: TabKey;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type DocumentItem = {
  id: string;
  name: string;
  tag: string | null;
  note: string | null;
  version: number | null;
  is_latest: boolean | null;
  file_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

type CvExperience = {
  start: string;
  end: string;
  role: string;
  company: string;
  location: string;
  bullets: string[];
};

type CvEducation = {
  date: string;
  title: string;
  school: string;
  location: string;
};

type CvData = {
  name: string;
  title: string;
  summary: string;
  contact: {
    address: string;
    phone: string;
    email: string;
    linkedin: string;
  };
  websites: string[];
  core_skills: string[];
  specialties: string[];
  experience: CvExperience[];
  education: CvEducation[];
  certifications: string[];
  impact: string[];
};

type CvRow = {
  id: string;
  opportunity_id: string;
  data: CvData;
  photo_url: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

type PrepEntry = {
  id: string;
  topic: string;
  category: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PrepStep = {
  id: string;
  title: string;
  category: string;
  target_time: string;
  estimated_hours: number | null;
  progress: number;
  created_at: string;
  updated_at: string;
};

type StudyAsset = {
  id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string;
};

const defaultCvData: CvData = {
  name: "",
  title: "",
  summary: "",
  contact: {
    address: "",
    phone: "",
    email: "",
    linkedin: "",
  },
  websites: [],
  core_skills: [],
  specialties: [],
  experience: [],
  education: [],
  certifications: [],
  impact: [],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

function hoursBetween(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  if (Number.isNaN(diffMs)) return 0;
  return Math.max(diffMs / 3600000, 0);
}

function weekKey(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  const diff = (day === 0 ? -6 : 1) - day;
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default function OpportunityDetailPage() {
  const opportunityId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop() ?? ""
      : "";
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("JD");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docTag, setDocTag] = useState<(typeof docTags)[number]>("CV");
  const [docNote, setDocNote] = useState("");
  const [docEditing, setDocEditing] = useState<DocumentItem | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [cvData, setCvData] = useState<CvData>(defaultCvData);
  const [cvRow, setCvRow] = useState<CvRow | null>(null);
  const [cvPhotoFile, setCvPhotoFile] = useState<File | null>(null);
  const [cvSaving, setCvSaving] = useState(false);
  const [cvPhotoUploading, setCvPhotoUploading] = useState(false);
  const [cvPdfGenerating, setCvPdfGenerating] = useState(false);
  const [prepEntries, setPrepEntries] = useState<PrepEntry[]>([]);
  const [prepForm, setPrepForm] = useState({
    topic: "",
    category: "System Design",
    start_time: "",
    end_time: "",
    notes: "",
  });
  const [prepEditing, setPrepEditing] = useState<PrepEntry | null>(null);
  const [prepSteps, setPrepSteps] = useState<PrepStep[]>([]);
  const [stepForm, setStepForm] = useState({
    title: "",
    category: "System Design",
    target_time: "",
    estimated_hours: "",
  });
  const [studyAssets, setStudyAssets] = useState<StudyAsset[]>([]);
  const [studyCaption, setStudyCaption] = useState("");
  const [studyPreview, setStudyPreview] = useState<StudyAsset | null>(null);
  const [studyZoom, setStudyZoom] = useState(1);

  const prepTotalHours = prepEntries.reduce(
    (sum, entry) => sum + hoursBetween(entry.start_time, entry.end_time),
    0
  );
  const prepCategoryTotals = prepEntries.reduce<Record<string, number>>(
    (acc, entry) => {
      const key = entry.category || "Other";
      acc[key] = (acc[key] ?? 0) + hoursBetween(entry.start_time, entry.end_time);
      return acc;
    },
    {}
  );
  const prepWeeklyTotals = prepEntries.reduce<Record<string, number>>(
    (acc, entry) => {
      const key = weekKey(entry.start_time);
      acc[key] = (acc[key] ?? 0) + hoursBetween(entry.start_time, entry.end_time);
      return acc;
    },
    {}
  );
  const prepWeeklyRows = Object.entries(prepWeeklyTotals)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 6);

  const loadOpportunity = async () => {
    if (!opportunityId) return;
    try {
      const res = await authFetch(`/api/opportunities/${opportunityId}`, {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load opportunity.");
      }
      setOpportunity(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    }
  };

  const loadContent = async (type: TabKey) => {
    if (!opportunityId) return;
    setLoading(true);
    setError(null);
    try {
      if (type === "DOCS") {
        const res = await authFetch(`/api/opportunities/${opportunityId}/documents`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load documents.");
        }
        setDocuments(payload.data ?? []);
        return;
      }
      if (type === "CV") {
        const res = await authFetch(`/api/opportunities/${opportunityId}/cv`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load CV data.");
        }
        if (payload.data) {
          setCvRow(payload.data);
          setCvData({ ...defaultCvData, ...(payload.data.data ?? {}) });
        } else {
          setCvRow(null);
          setCvData(defaultCvData);
        }
        return;
      }
      if (type === "PREP") {
        const res = await authFetch(
          `/api/opportunities/${opportunityId}/prep`,
          { cache: "no-store" }
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load prep entries.");
        }
        setPrepEntries(payload.data ?? []);
        const stepsRes = await authFetch(
          `/api/opportunities/${opportunityId}/prep-steps`,
          { cache: "no-store" }
        );
        const stepsPayload = await stepsRes.json();
        if (!stepsRes.ok) {
          throw new Error(stepsPayload?.error || "Failed to load prep steps.");
        }
        setPrepSteps(stepsPayload.data ?? []);
        return;
      }
      if (type === "STUDY") {
        const res = await authFetch(
          `/api/opportunities/${opportunityId}/study-assets`,
          { cache: "no-store" }
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load study assets.");
        }
        setStudyAssets(payload.data ?? []);
        return;
      }

      const res = await authFetch(
        `/api/opportunities/${opportunityId}/content?type=${type}`,
        { cache: "no-store" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load content.");
      }
      setItems(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  useEffect(() => {
    loadContent(activeTab);
    setEditing(null);
    setForm({ title: "", content: "" });
    setDocEditing(null);
    setDocName("");
    setDocTag("CV");
    setDocNote("");
    setDocFile(null);
    setPreviewDocId(null);
    setCvPhotoFile(null);
    setPrepEditing(null);
    setPrepForm({
      topic: "",
      category: "System Design",
      start_time: "",
      end_time: "",
      notes: "",
    });
    setStepForm({
      title: "",
      category: "System Design",
      target_time: "",
      estimated_hours: "",
    });
    setStudyCaption("");
    setStudyPreview(null);
    setStudyZoom(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSave = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    if (activeTab === "DOCS" || activeTab === "CV" || activeTab === "PREP") {
      setError("Use the section controls to save entries.");
      return;
    }
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const res = await authFetch(
          `/api/opportunities/${opportunityId}/content/${editing.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: form.title,
              content: form.content,
            }),
          }
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to update content.");
        }
        setItems((prev) =>
          prev.map((item) => (item.id === editing.id ? payload.data : item))
        );
        setEditing(null);
        setForm({ title: "", content: "" });
      } else {
        const res = await authFetch(`/api/opportunities/${opportunityId}/content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: activeTab,
            title: form.title,
            content: form.content,
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to create content.");
        }
        setItems((prev) => [payload.data, ...prev]);
        setForm({ title: "", content: "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content });
  };

  const handleDelete = async (item: ContentItem) => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/content/${item.id}`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete content.");
      }
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      if (editing?.id === item.id) {
        setEditing(null);
        setForm({ title: "", content: "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    if (!docFile) {
      setError("Select a file to upload.");
      return;
    }
    if (!docTag) {
      setError("Select a document tag.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("file", docFile);
      data.append("name", docName.trim() ? docName.trim() : docFile.name);
      data.append("tag", docTag);
      if (docNote.trim()) {
        data.append("note", docNote.trim());
      }
      const res = await authFetch(`/api/opportunities/${opportunityId}/documents`, {
        method: "POST",
        body: data,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to upload document.");
      }
      setDocuments((prev) => [payload.data, ...prev]);
      setDocFile(null);
      setDocName("");
      setDocTag("CV");
      setDocNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentRename = async () => {
    if (!docEditing) return;
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/documents/${docEditing.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: docName,
            tag: docTag,
            note: docNote.trim() ? docNote.trim() : null,
          }),
        }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to rename document.");
      }
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docEditing.id ? payload.data : doc))
      );
      setDocEditing(null);
      setDocName("");
      setDocTag("CV");
      setDocNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentDelete = async (doc: DocumentItem) => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/documents/${doc.id}`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete document.");
      }
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const toList = (value: string) =>
    value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

  const listToText = (items: string[]) => items.join("\n");

  const updateExperience = (index: number, patch: Partial<CvExperience>) => {
    setCvData((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], ...patch };
      return { ...prev, experience: next };
    });
  };

  const addExperience = () => {
    setCvData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { start: "", end: "", role: "", company: "", location: "", bullets: [] },
      ],
    }));
  };

  const removeExperience = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, idx) => idx !== index),
    }));
  };

  const updateEducation = (index: number, patch: Partial<CvEducation>) => {
    setCvData((prev) => {
      const next = [...prev.education];
      next[index] = { ...next[index], ...patch };
      return { ...prev, education: next };
    });
  };

  const addEducation = () => {
    setCvData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { date: "", title: "", school: "", location: "" },
      ],
    }));
  };

  const removeEducation = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.filter((_, idx) => idx !== index),
    }));
  };

  const handleCvSave = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setCvSaving(true);
    setError(null);
    try {
      const res = await authFetch(`/api/opportunities/${opportunityId}/cv`, {
        method: cvRow ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: cvData }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to save CV.");
      }
      setCvRow(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setCvSaving(false);
    }
  };

  const handleCvPhotoUpload = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    if (!cvPhotoFile) {
      setError("Select a photo to upload.");
      return;
    }
    setCvPhotoUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("file", cvPhotoFile);
      const res = await authFetch(`/api/opportunities/${opportunityId}/cv/photo`, {
        method: "POST",
        body: data,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to upload photo.");
      }
      setCvRow(payload.data);
      setCvPhotoFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setCvPhotoUploading(false);
    }
  };

  const handleCvGeneratePdf = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setCvPdfGenerating(true);
    setError(null);
    try {
      const res = await authFetch(`/api/opportunities/${opportunityId}/cv/pdf`, {
        method: "POST",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to generate PDF.");
      }
      setCvRow(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setCvPdfGenerating(false);
    }
  };

  const handlePrepSave = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    if (!prepForm.topic.trim() || !prepForm.start_time || !prepForm.end_time) {
      setError("Topic, start time, and end time are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        topic: prepForm.topic.trim(),
        category: prepForm.category,
        start_time: prepForm.start_time,
        end_time: prepForm.end_time,
        notes: prepForm.notes.trim() ? prepForm.notes.trim() : null,
      };
      const res = await authFetch(
        prepEditing
          ? `/api/opportunities/${opportunityId}/prep/${prepEditing.id}`
          : `/api/opportunities/${opportunityId}/prep`,
        {
          method: prepEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Failed to save prep entry.");
      }
      if (prepEditing) {
        setPrepEntries((prev) =>
          prev.map((item) => (item.id === prepEditing.id ? result.data : item))
        );
      } else {
        setPrepEntries((prev) => [result.data, ...prev]);
      }
      setPrepEditing(null);
      setPrepForm({
        topic: "",
        category: "System Design",
        start_time: "",
        end_time: "",
        notes: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrepEdit = (entry: PrepEntry) => {
    setPrepEditing(entry);
    setPrepForm({
      topic: entry.topic,
      category: entry.category,
      start_time: entry.start_time,
      end_time: entry.end_time,
      notes: entry.notes ?? "",
    });
  };

  const handlePrepDelete = async (entryId: string) => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/prep/${entryId}`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete entry.");
      }
      setPrepEntries((prev) => prev.filter((item) => item.id !== entryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleStepSave = async () => {
    if (!opportunityId) {
      setError("Missing opportunity id.");
      return;
    }
    if (!stepForm.title.trim() || !stepForm.target_time) {
      setError("Title and target time are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: stepForm.title.trim(),
        category: stepForm.category,
        target_time: stepForm.target_time,
        estimated_hours: stepForm.estimated_hours
          ? Number(stepForm.estimated_hours)
          : null,
      };
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/prep-steps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Failed to save prep step.");
      }
      setPrepSteps((prev) => [result.data, ...prev]);
      setStepForm({
        title: "",
        category: "System Design",
        target_time: "",
        estimated_hours: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleStepProgress = async (step: PrepStep, progress: number) => {
    if (!opportunityId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/prep-steps/${step.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress }),
        }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update progress.");
      }
      setPrepSteps((prev) =>
        prev.map((item) => (item.id === step.id ? payload.data : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleStepDelete = async (stepId: string) => {
    if (!opportunityId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/prep-steps/${stepId}`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete step.");
      }
      setPrepSteps((prev) => prev.filter((item) => item.id !== stepId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleStudyPaste = async (
    event: React.ClipboardEvent<HTMLDivElement>
  ) => {
    if (!opportunityId) return;
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/")
    );
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;

    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("caption", studyCaption.trim());
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/study-assets`,
        {
          method: "POST",
          body: data,
        }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to upload screenshot.");
      }
      setStudyAssets((prev) => [payload.data, ...prev]);
      setStudyCaption("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const handleStudyDelete = async (assetId: string) => {
    if (!opportunityId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/opportunities/${opportunityId}/study-assets/${assetId}`,
        { method: "DELETE" }
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete screenshot.");
      }
      setStudyAssets((prev) => prev.filter((asset) => asset.id !== assetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 text-[15px] md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
            Opportunity Workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {opportunity
              ? `${opportunity.company} - ${opportunity.title}`
              : "Loading..."}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <span>Status: {opportunity?.status ?? "-"}</span>
            <span>Source: {opportunity?.source ?? "-"}</span>
            <span>Location: {opportunity?.location ?? "-"}</span>
            {opportunity?.url && (
              <a
                className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                href={opportunity.url}
                target="_blank"
                rel="noreferrer"
              >
                Open Link
              </a>
            )}
          </div>
        </header>

        <section className="rounded-[28px] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow)]">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] ${
                  activeTab === tab.key
                    ? "border-[var(--accent-2)] text-[var(--accent-2)]"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            {activeTab === "STUDY" ? (
              <div className="lg:col-span-2 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <h2 className="text-lg font-semibold">Study Screenshots</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Paste screenshots here to store them for this opportunity.
                  </p>
                  <textarea
                    className="mt-4 min-h-[120px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                    placeholder="Optional caption for the next paste"
                    value={studyCaption}
                    onChange={(e) => setStudyCaption(e.target.value)}
                  />
                  <div
                    className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-[var(--muted)]"
                    onPaste={handleStudyPaste}
                  >
                    Click here, then paste (Ctrl+V) a screenshot.
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Saved Screenshots</h2>
                  {!studyAssets.length && (
                    <p className="text-sm text-[var(--muted)]">
                      No screenshots yet.
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {studyAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3"
                      >
                        {asset.image_url && (
                          <img
                            src={asset.image_url}
                            alt="Study screenshot"
                            className="h-40 w-full cursor-zoom-in rounded-xl object-cover"
                            onClick={() => {
                              setStudyPreview(asset);
                              setStudyZoom(1);
                            }}
                          />
                        )}
                        {asset.caption && (
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            {asset.caption}
                          </p>
                        )}
                        <button
                          className="mt-3 text-xs uppercase tracking-[0.2em] text-red-500"
                          onClick={() => handleStudyDelete(asset.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === "PREP" ? (
              <div className="lg:col-span-2 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <h2 className="text-lg font-semibold">
                    {prepEditing ? "Edit Prep Entry" : "New Prep Entry"}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    <input
                      className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Preparation topic"
                      value={prepForm.topic}
                      onChange={(e) =>
                        setPrepForm((prev) => ({ ...prev, topic: e.target.value }))
                      }
                    />
                    <select
                      className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      value={prepForm.category}
                      onChange={(e) =>
                        setPrepForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                    >
                      {[
                        "System Design",
                        "Behavioral/STAR",
                        "Coding",
                        "Leadership",
                        "Domain",
                      ].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        type="datetime-local"
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        value={prepForm.start_time}
                        onChange={(e) =>
                          setPrepForm((prev) => ({
                            ...prev,
                            start_time: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="datetime-local"
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        value={prepForm.end_time}
                        onChange={(e) =>
                          setPrepForm((prev) => ({
                            ...prev,
                            end_time: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <textarea
                      className="min-h-[120px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Notes or outcome"
                      value={prepForm.notes}
                      onChange={(e) =>
                        setPrepForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                    />
                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                        onClick={handlePrepSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : prepEditing ? "Update" : "Save"}
                      </button>
                      {prepEditing && (
                        <button
                          className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                          onClick={() => {
                            setPrepEditing(null);
                            setPrepForm({
                              topic: "",
                              category: "System Design",
                              start_time: "",
                              end_time: "",
                              notes: "",
                            });
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Prep Log</h2>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/90 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Prep Plan
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Prep step title"
                        value={stepForm.title}
                        onChange={(e) =>
                          setStepForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                      />
                      <select
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        value={stepForm.category}
                        onChange={(e) =>
                          setStepForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                      >
                        {[
                          "System Design",
                          "Behavioral/STAR",
                          "Coding",
                          "Leadership",
                          "Domain",
                        ].map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        value={stepForm.target_time}
                        onChange={(e) =>
                          setStepForm((prev) => ({
                            ...prev,
                            target_time: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="number"
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Estimated hours"
                        value={stepForm.estimated_hours}
                        onChange={(e) =>
                          setStepForm((prev) => ({
                            ...prev,
                            estimated_hours: e.target.value,
                          }))
                        }
                        step="0.25"
                        min="0"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                        onClick={handleStepSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Add Step"}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      {prepSteps.map((step) => (
                        <div
                          key={step.id}
                          className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-sm font-semibold">{step.title}</h4>
                              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                {step.category}
                              </p>
                              <p className="mt-2 text-xs text-[var(--muted)]">
                                Target: {new Date(step.target_time).toLocaleString()}
                              </p>
                            </div>
                            <button
                              className="text-xs uppercase tracking-[0.2em] text-red-500"
                              onClick={() => handleStepDelete(step.id)}
                            >
                              Delete
                            </button>
                          </div>
                          <div className="mt-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={step.progress}
                              onChange={(e) =>
                                handleStepProgress(step, Number(e.target.value))
                              }
                              className="w-full"
                            />
                            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Progress: {step.progress}%
                            </div>
                          </div>
                        </div>
                      ))}
                      {!prepSteps.length && (
                        <p className="text-sm text-[var(--muted)]">
                          No prep steps yet.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--line)] bg-white/90 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Total Hours
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {prepTotalHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-white/90 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Category Totals
                      </p>
                      <div className="mt-2 flex flex-col gap-1 text-sm">
                        {Object.entries(prepCategoryTotals).map(
                          ([category, hours]) => (
                            <div
                              key={category}
                              className="flex items-center justify-between"
                            >
                              <span>{category}</span>
                              <span className="text-[var(--muted)]">
                                {hours.toFixed(1)}h
                              </span>
                            </div>
                          )
                        )}
                        {!Object.keys(prepCategoryTotals).length && (
                          <span className="text-sm text-[var(--muted)]">
                            No categories yet.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-white/90 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Weekly Summary
                      </p>
                      <div className="mt-2 flex flex-col gap-1 text-sm">
                        {prepWeeklyRows.map(([weekStart, hours]) => (
                          <div
                            key={weekStart}
                            className="flex items-center justify-between"
                          >
                            <span>{weekStart}</span>
                            <span className="text-[var(--muted)]">
                              {hours.toFixed(1)}h
                            </span>
                          </div>
                        ))}
                        {!prepWeeklyRows.length && (
                          <span className="text-sm text-[var(--muted)]">
                            No prep this week.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {loading && (
                    <p className="text-sm text-[var(--muted)]">Loading...</p>
                  )}
                  {!loading && !prepEntries.length && (
                    <p className="text-sm text-[var(--muted)]">
                      No preparation entries yet.
                    </p>
                  )}
                  {prepEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold">{entry.topic}</h3>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            {entry.category}
                          </p>
                          <p className="mt-2 text-xs text-[var(--muted)]">
                            {new Date(entry.start_time).toLocaleString()} -{" "}
                            {new Date(entry.end_time).toLocaleString()}
                          </p>
                          {entry.notes && (
                            <p className="mt-2 text-sm text-[var(--muted)] whitespace-pre-wrap">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                            onClick={() => handlePrepEdit(entry)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-red-500"
                            onClick={() => handlePrepDelete(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "CV" ? (
              <div className="lg:col-span-2 grid gap-6">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">CV Builder</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Save structured content, upload photo, and generate the A4 PDF.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                        onClick={handleCvSave}
                        disabled={cvSaving}
                      >
                        {cvSaving ? "Saving..." : "Save CV"}
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                        onClick={handleCvGeneratePdf}
                        disabled={cvPdfGenerating}
                      >
                        {cvPdfGenerating ? "Generating..." : "Generate PDF"}
                      </button>
                      {cvRow?.pdf_url && (
                        <a
                          className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                          href={cvRow.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Sidebar Details
                    </h3>
                    <div className="mt-4 flex flex-col gap-3">
                      <input
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Full name"
                        value={cvData.name}
                        onChange={(e) =>
                          setCvData((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                      <input
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Title (e.g., Senior Engineering Leader)"
                        value={cvData.title}
                        onChange={(e) =>
                          setCvData((prev) => ({ ...prev, title: e.target.value }))
                        }
                      />
                      <textarea
                        className="min-h-[120px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Professional summary"
                        value={cvData.summary}
                        onChange={(e) =>
                          setCvData((prev) => ({ ...prev, summary: e.target.value }))
                        }
                      />

                      <div className="grid gap-3">
                        <input
                          className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                          placeholder="Address"
                          value={cvData.contact.address}
                          onChange={(e) =>
                            setCvData((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, address: e.target.value },
                            }))
                          }
                        />
                        <input
                          className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                          placeholder="Phone"
                          value={cvData.contact.phone}
                          onChange={(e) =>
                            setCvData((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, phone: e.target.value },
                            }))
                          }
                        />
                        <input
                          className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                          placeholder="Email"
                          value={cvData.contact.email}
                          onChange={(e) =>
                            setCvData((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, email: e.target.value },
                            }))
                          }
                        />
                        <input
                          className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                          placeholder="LinkedIn URL"
                          value={cvData.contact.linkedin}
                          onChange={(e) =>
                            setCvData((prev) => ({
                              ...prev,
                              contact: { ...prev.contact, linkedin: e.target.value },
                            }))
                          }
                        />
                      </div>

                      <div className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          Passport Photo
                        </p>
                        {cvRow?.photo_url && (
                          <img
                            src={cvRow.photo_url}
                            alt="CV photo"
                            className="mt-3 h-28 w-28 rounded-lg object-cover"
                          />
                        )}
                        <input
                          type="file"
                          className="mt-3 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                          onChange={(e) =>
                            setCvPhotoFile(e.target.files?.[0] ?? null)
                          }
                        />
                        <button
                          className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                          onClick={handleCvPhotoUpload}
                          disabled={cvPhotoUploading}
                        >
                          {cvPhotoUploading ? "Uploading..." : "Upload Photo"}
                        </button>
                      </div>

                      <textarea
                        className="min-h-[110px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Websites (one per line)"
                        value={listToText(cvData.websites)}
                        onChange={(e) =>
                          setCvData((prev) => ({
                            ...prev,
                            websites: toList(e.target.value),
                          }))
                        }
                      />
                      <textarea
                        className="min-h-[110px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Core skills (one per line)"
                        value={listToText(cvData.core_skills)}
                        onChange={(e) =>
                          setCvData((prev) => ({
                            ...prev,
                            core_skills: toList(e.target.value),
                          }))
                        }
                      />
                      <textarea
                        className="min-h-[110px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Specialties (one per line)"
                        value={listToText(cvData.specialties)}
                        onChange={(e) =>
                          setCvData((prev) => ({
                            ...prev,
                            specialties: toList(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Main Content
                    </h3>
                    <div className="mt-4 flex flex-col gap-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Experience</h4>
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                            onClick={addExperience}
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-3 flex flex-col gap-4">
                          {cvData.experience.map((exp, index) => (
                            <div
                              key={`${exp.company}-${index}`}
                              className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
                            >
                              <div className="grid gap-3 md:grid-cols-2">
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="Start (e.g., 2022-03)"
                                  value={exp.start}
                                  onChange={(e) =>
                                    updateExperience(index, { start: e.target.value })
                                  }
                                />
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="End (e.g., 2024-10 or Current)"
                                  value={exp.end}
                                  onChange={(e) =>
                                    updateExperience(index, { end: e.target.value })
                                  }
                                />
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2 md:col-span-2"
                                  placeholder="Role Title"
                                  value={exp.role}
                                  onChange={(e) =>
                                    updateExperience(index, { role: e.target.value })
                                  }
                                />
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="Company"
                                  value={exp.company}
                                  onChange={(e) =>
                                    updateExperience(index, { company: e.target.value })
                                  }
                                />
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="Location"
                                  value={exp.location}
                                  onChange={(e) =>
                                    updateExperience(index, { location: e.target.value })
                                  }
                                />
                              </div>
                              <textarea
                                className="mt-3 min-h-[100px] w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                placeholder="Bullets (one per line)"
                                value={listToText(exp.bullets)}
                                onChange={(e) =>
                                  updateExperience(index, {
                                    bullets: toList(e.target.value),
                                  })
                                }
                              />
                              <button
                                className="mt-2 text-xs uppercase tracking-[0.2em] text-red-500"
                                onClick={() => removeExperience(index)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          {!cvData.experience.length && (
                            <p className="text-sm text-[var(--muted)]">
                              Add your experience entries here.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Education</h4>
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                            onClick={addEducation}
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-3 flex flex-col gap-4">
                          {cvData.education.map((edu, index) => (
                            <div
                              key={`${edu.title}-${index}`}
                              className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
                            >
                              <div className="grid gap-3 md:grid-cols-2">
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="Date (e.g., 2021-10)"
                                  value={edu.date}
                                  onChange={(e) =>
                                    updateEducation(index, { date: e.target.value })
                                  }
                                />
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="Degree / Program"
                                  value={edu.title}
                                  onChange={(e) =>
                                    updateEducation(index, { title: e.target.value })
                                  }
                                />
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="University / School"
                                  value={edu.school}
                                  onChange={(e) =>
                                    updateEducation(index, { school: e.target.value })
                                  }
                                />
                                <input
                                  className="w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
                                  placeholder="Location"
                                  value={edu.location}
                                  onChange={(e) =>
                                    updateEducation(index, { location: e.target.value })
                                  }
                                />
                              </div>
                              <button
                                className="mt-2 text-xs uppercase tracking-[0.2em] text-red-500"
                                onClick={() => removeEducation(index)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          {!cvData.education.length && (
                            <p className="text-sm text-[var(--muted)]">
                              Add your education details here.
                            </p>
                          )}
                        </div>
                      </div>

                      <textarea
                        className="min-h-[120px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Certifications (one per line)"
                        value={listToText(cvData.certifications)}
                        onChange={(e) =>
                          setCvData((prev) => ({
                            ...prev,
                            certifications: toList(e.target.value),
                          }))
                        }
                      />
                      <textarea
                        className="min-h-[140px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        placeholder="Platform & Product Impact (one per line)"
                        value={listToText(cvData.impact)}
                        onChange={(e) =>
                          setCvData((prev) => ({
                            ...prev,
                            impact: toList(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "DOCS" ? (
              <div className="lg:col-span-2 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <h2 className="text-lg font-semibold">
                    {docEditing ? "Rename Document" : "Upload Document"}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    <input
                      className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Document name"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                    />
                    <select
                      className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      value={docTag}
                      onChange={(e) =>
                        setDocTag(e.target.value as (typeof docTags)[number])
                      }
                    >
                      {docTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="min-h-[120px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Optional note (what was shared, context, etc.)"
                      value={docNote}
                      onChange={(e) => setDocNote(e.target.value)}
                    />
                    {!docEditing && (
                      <input
                        type="file"
                        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                        onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                        onClick={
                          docEditing ? handleDocumentRename : handleDocumentUpload
                        }
                        disabled={saving}
                      >
                        {saving ? "Saving..." : docEditing ? "Rename" : "Upload"}
                      </button>
                      {docEditing && (
                        <button
                          className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                          onClick={() => {
                            setDocEditing(null);
                            setDocName("");
                            setDocTag("CV");
                            setDocNote("");
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Shared Files</h2>
                  {loading && (
                    <p className="text-sm text-[var(--muted)]">Loading...</p>
                  )}
                  {!loading && !documents.length && (
                    <p className="text-sm text-[var(--muted)]">
                      No documents uploaded yet.
                    </p>
                  )}
                  {Object.entries(
                    documents.reduce<Record<string, DocumentItem[]>>(
                      (acc, doc) => {
                        const key = doc.tag || "Other";
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(doc);
                        return acc;
                      },
                      {}
                    )
                  ).map(([tag, docs]) => (
                    <div key={tag} className="rounded-2xl border border-[var(--line)] p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-2)]">
                        {tag}
                      </h3>
                      <div className="mt-3 flex flex-col gap-3">
                        {docs.map((doc) => {
                          const isPdf =
                            doc.mime_type?.includes("pdf") ||
                            (doc.file_url?.toLowerCase().endsWith(".pdf") ?? false);
                          const showPreview = previewDocId === doc.id && isPdf;
                          return (
                            <div
                              key={doc.id}
                              className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold">{doc.name}</h4>
                                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Version {doc.version ?? 1} {doc.is_latest ? "(Latest)" : ""}
                                  </p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Updated {formatDate(doc.updated_at)}
                                  </p>
                                  {doc.note && (
                                    <p className="mt-2 text-sm text-[var(--muted)] whitespace-pre-wrap">
                                      {doc.note}
                                    </p>
                                  )}
                                  <div className="mt-3 flex flex-wrap gap-3">
                                    {doc.file_url && (
                                      <a
                                        className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Download
                                      </a>
                                    )}
                                    {isPdf && doc.file_url && (
                                      <button
                                        className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                                        onClick={() =>
                                          setPreviewDocId(showPreview ? null : doc.id)
                                        }
                                      >
                                        {showPreview ? "Hide Preview" : "Preview"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button
                                    className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                                    onClick={() => {
                                      setDocEditing(doc);
                                      setDocName(doc.name);
                                      setDocTag(
                                        (doc.tag as (typeof docTags)[number]) || "Other"
                                      );
                                      setDocNote(doc.note ?? "");
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="text-xs uppercase tracking-[0.2em] text-red-500"
                                    onClick={() => handleDocumentDelete(doc)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {showPreview && doc.file_url && (
                                <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
                                  <iframe
                                    title={`Preview ${doc.name}`}
                                    src={doc.file_url}
                                    className="h-[480px] w-full"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <h2 className="text-lg font-semibold">
                    {editing ? "Edit Entry" : "New Entry"}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    <input
                      className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Title"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    />
                    <textarea
                      className="min-h-[180px] w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                      placeholder="Write your notes, drafts, or study material here..."
                      value={form.content}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, content: e.target.value }))
                      }
                    />
                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      {editing && (
                        <button
                          className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
                          onClick={() => {
                            setEditing(null);
                            setForm({ title: "", content: "" });
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Saved Entries</h2>
                  {loading && (
                    <p className="text-sm text-[var(--muted)]">Loading...</p>
                  )}
                  {!loading && !items.length && (
                    <p className="text-sm text-[var(--muted)]">
                      No entries yet for this section.
                    </p>
                  )}
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                          <p className="mt-2 text-sm text-[var(--muted)] whitespace-pre-wrap">
                            {item.content}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            Updated {formatDate(item.updated_at)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs uppercase tracking-[0.2em] text-red-500"
                            onClick={() => handleDelete(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {studyPreview?.image_url && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
                onClick={() => setStudyPreview(null)}
              >
                <div
                  className="max-h-full w-full max-w-5xl rounded-2xl bg-white p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Study Screenshot</div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1"
                        onClick={() =>
                          setStudyZoom((prev) => Math.max(0.5, prev - 0.1))
                        }
                      >
                        -
                      </button>
                      <span>{Math.round(studyZoom * 100)}%</span>
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1"
                        onClick={() =>
                          setStudyZoom((prev) => Math.min(3, prev + 0.1))
                        }
                      >
                        +
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1"
                        onClick={() => setStudyZoom(1)}
                      >
                        Reset
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1"
                        onClick={() => setStudyPreview(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 max-h-[75vh] overflow-auto rounded-xl border border-[var(--line)] bg-black/5 p-4">
                    <img
                      src={studyPreview.image_url}
                      alt="Study full"
                      style={{
                        transform: `scale(${studyZoom})`,
                        transformOrigin: "center top",
                      }}
                      className="mx-auto block max-w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
