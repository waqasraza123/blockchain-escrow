import { searchOperator } from "../../../lib/operator-api";
import { Card, ConsoleHeader, DataTable, EmptyState, Pill, toneForStatus } from "../ui";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? await searchOperator(query) : null;

  return (
    <>
      <ConsoleHeader
        eyebrow="Search"
        subtitle="Search deals, versions, agreements, disputes, and tracked transactions."
        title="Global Operator Search"
      />
      <Card title="Lookup">
        <form action="/search" className="form-grid">
          <div className="field">
            <label htmlFor="q">Query</label>
            <input
              defaultValue={query}
              id="q"
              name="q"
              placeholder="deal id, tx hash, agreement address, title"
            />
          </div>
          <div className="actions-row">
            <button className="button" type="submit">
              Search
            </button>
          </div>
        </form>
      </Card>
      <Card title="Results">
        {!query ? (
          <EmptyState body="Run a query to search the operator index." />
        ) : results && results.hits.length > 0 ? (
          <DataTable headers={["Entity", "Identifier", "Status", "Route"]}>
            {results.hits.map((hit) => (
              <tr key={`${hit.entityType}:${hit.id}`}>
                <td>
                  <div className="stack-sm">
                    <strong>{hit.title}</strong>
                    <span className="muted">{hit.entityType}</span>
                  </div>
                </td>
                <td className="mono">{hit.primaryIdentifier}</td>
                <td>
                  <Pill
                    tone={toneForStatus(hit.status)}
                    value={hit.status ?? "UNKNOWN"}
                  />
                </td>
                <td>
                  <a className="link-text" href={hit.route}>
                    {hit.route}
                  </a>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState body="No operational entities matched that query." />
        )}
      </Card>
    </>
  );
}
