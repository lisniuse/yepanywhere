export function DashboardPage() {
  return (
    <section className="page-surface">
      <div className="page-heading">
        <p className="eyebrow">Client V2</p>
        <h1>新的 Yep Anywhere 界面骨架</h1>
        <p>
          Vite、React、TypeScript 和 Less 已经就位。这里可以开始重做信息架构、
          会话列表和移动端优先的交互。
        </p>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Providers</span>
          <strong>Ready</strong>
        </article>
        <article className="metric-card">
          <span>Sessions</span>
          <strong>Mock</strong>
        </article>
        <article className="metric-card">
          <span>Transport</span>
          <strong>Pending</strong>
        </article>
      </div>
    </section>
  );
}
