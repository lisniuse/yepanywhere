const sessions = [
  {
    title: "Yep Anywhere redesign",
    project: "D:/dev/github/yepanywhere",
    status: "Active",
  },
  {
    title: "Mobile approval flow",
    project: "packages/clientv2",
    status: "Draft",
  },
];

export function SessionsPage() {
  return (
    <section className="page-surface">
      <div className="page-heading">
        <p className="eyebrow">Sessions</p>
        <h1>会话列表占位</h1>
        <p>后续可以在这里接入现有 `/api/sessions` 或新设计的数据模型。</p>
      </div>

      <div className="session-list">
        {sessions.map((session) => (
          <article className="session-row" key={session.title}>
            <div>
              <h2>{session.title}</h2>
              <p>{session.project}</p>
            </div>
            <span>{session.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
