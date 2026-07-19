interface BookSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

export function BookSearch({ value, onChange, resultCount }: BookSearchProps) {
  return (
    <div className="book-search">
      <label htmlFor="book-search">ค้นหาหนังสือ</label>
      <input
        id="book-search"
        name="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="search-results" role="status" aria-live="polite">
        พบ {resultCount} เล่ม{value.trim() ? <span className="search-query"> · “{value.trim()}”</span> : null}
      </p>
    </div>
  );
}
