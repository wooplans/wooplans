"use client";

import { useState } from "react";

type Template = { id: string; label: string; subject: string; message: string };

export function FollowUpEmailForm({ templates, action }: { templates: Template[]; action: (form: FormData) => Promise<void> }) {
  const [subject, setSubject] = useState(templates[0]?.subject ?? "");
  const [message, setMessage] = useState(templates[0]?.message ?? "");
  return (
    <form action={action} className="mt-3 grid gap-3">
      <select
        className="input"
        onChange={(e) => {
          const t = templates.find((x) => x.id === e.target.value);
          if (t) {
            setSubject(t.subject);
            setMessage(t.message);
          }
        }}
      >
        {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
      <textarea name="message" rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className="input" />
      <label className="text-sm"><span className="label">Prochaine relance (facultatif)</span><input type="date" name="nextFollowUpAt" className="input" /></label>
      <button className="btn-primary">Envoyer l&apos;email</button>
    </form>
  );
}
