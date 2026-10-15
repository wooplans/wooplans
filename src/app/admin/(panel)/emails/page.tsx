import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDateTime, PageTitle, Table } from "@/components/admin/ui";

export default async function EmailsPage() {
  const logs = await getDb().query.emailLog.findMany({ orderBy: desc(schema.emailLog.createdAt), limit: 200 });
  return (
    <>
      <PageTitle title="Emails envoyés" subtitle="Codes d'accès, notifications et relances envoyés via Resend." />
      <Table head={["Date", "Destinataire", "Objet", "Type", "Statut"]} empty={logs.length === 0}>
        {logs.map((l) => (
          <tr key={l.id}>
            <td className="px-4 py-2.5 whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
            <td className="px-4 py-2.5">{l.to}</td>
            <td className="px-4 py-2.5">{l.subject}</td>
            <td className="px-4 py-2.5 text-xs text-muted">{l.template}</td>
            <td className="px-4 py-2.5">
              <Badge tone={l.status === "sent" ? "good" : l.status === "failed" ? "bad" : "warn"}>{l.status}</Badge>
              {l.error ? <p className="mt-1 text-xs text-secondary">{l.error}</p> : null}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
