import { searchOperator } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import { Card, ConsoleHeader, DataTable, EmptyState, Pill, toneForStatus } from "../ui";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const { messages } = await getI18n();
  const query = params.q?.trim() ?? "";
  const results = query ? await searchOperator(query) : null;

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.search}
        subtitle={messages.search.subtitle}
        title={messages.search.title}
      />
      <Card title={messages.search.lookup}>
        <form action="/search" className="form-grid">
          <div className="field">
            <label htmlFor="q">{messages.search.query}</label>
            <input
              defaultValue={query}
              id="q"
              name="q"
              placeholder={messages.search.placeholder}
            />
          </div>
          <div className="actions-row">
            <button className="button" type="submit">
              {messages.search.search}
            </button>
          </div>
        </form>
      </Card>
      <Card title={messages.search.lookup}>
        {!query ? (
          <EmptyState body={messages.search.empty} />
        ) : results && results.hits.length > 0 ? (
          <DataTable
            headers={[
              messages.search.entity,
              messages.search.identifier,
              messages.search.chain,
              messages.search.status,
              messages.search.route
            ]}
          >
            {results.hits.map((hit) => (
              <tr key={`${hit.entityType}:${hit.id}`}>
                <td>
                  <div className="stack-sm">
                    <strong>{hit.title}</strong>
                    <span className="muted">
                      {hit.subtitle
                        ? `${hit.entityType} · ${hit.subtitle}`
                        : hit.entityType}
                    </span>
                  </div>
                </td>
                <td className="mono">{hit.primaryIdentifier}</td>
                <td>
                  {hit.chainId !== null
                    ? `${hit.network ?? messages.common.none} (${hit.chainId})`
                    : messages.common.na}
                </td>
                <td>
                  <Pill
                    tone={toneForStatus(hit.status)}
                    value={formatCode(hit.status ?? "UNKNOWN", messages.statuses, messages.common.none)}
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
          <EmptyState body={messages.search.noResults} />
        )}
      </Card>
    </>
  );
}
