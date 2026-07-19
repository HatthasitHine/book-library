interface BookSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

export function BookSearch({ value, onChange, resultCount }: BookSearchProps) {
  return (
    <div>
      <label htmlFor="book-search">ค้นหาหนังสือ</label>
      <input
        id="book-search"
        name="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p aria-live="polite">พบ {resultCount} เล่ม</p>
    </div>
  );
}
