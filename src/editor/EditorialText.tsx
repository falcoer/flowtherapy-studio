/** Deliberately small formatting grammar. HTML, links and embeds stay inert text. */
function inline(text: string) {
  return text
    .split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("*") && part.endsWith("*") ? (
        <em key={index}>{part.slice(1, -1)}</em>
      ) : (
        part
      ),
    );
}
export function EditorialText({ text }: { text: string }) {
  return (
    <div className="editorial-prose">
      {text.split("\n").map((line, index) => {
        if (line.startsWith("## "))
          return <h3 key={index}>{inline(line.slice(3))}</h3>;
        if (line.startsWith("# "))
          return <h2 key={index}>{inline(line.slice(2))}</h2>;
        if (line.startsWith("- "))
          return (
            <p className="editorial-bullet" key={index}>
              • {inline(line.slice(2))}
            </p>
          );
        return <p key={index}>{line ? inline(line) : <br />}</p>;
      })}
    </div>
  );
}
