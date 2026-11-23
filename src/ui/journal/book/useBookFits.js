// React hook: true while the journal book is big enough to read (fit.js). Kept apart from JournalBook.jsx so the
// panel that chooses between the book and the old notebook does not load the book.
import { useEffect, useState } from 'react'
import { bookFits } from './fit.js'
export function useBookFits() {
  const [ok, setOk] = useState(bookFits)
  useEffect(() => { const f = () => setOk(bookFits()); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  return ok
}
