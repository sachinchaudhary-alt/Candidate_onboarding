/* Plain premium card. Optional header with a title and a right-side action. */
export default function Card({ id, title, action, children, bodyStyle }) {
  return (
    <section className="ta-card" id={id}>
      {(title || action) && (
        <div className="ta-card__head">
          {title && <h3 className="ta-card__title">{title}</h3>}
          {action}
        </div>
      )}
      <div className="ta-card__body" style={bodyStyle}>{children}</div>
    </section>
  );
}
