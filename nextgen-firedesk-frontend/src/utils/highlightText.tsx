/**
 * Utility to highlight search terms in text
 * Returns JSX with highlighted portions
 */

export const highlightText = (text: string, searchTerm: string): JSX.Element => {
  if (!searchTerm || !text) {
    return <>{text}</>;
  }

  // Escape special regex characters in search term
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedTerm})`, 'gi');

  // Split text by matches
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches the search term (case-insensitive)
        const isMatch = part.toLowerCase() === searchTerm.toLowerCase();

        return isMatch ? (
          <span
            key={index}
            className="bg-yellow-200 dark:bg-yellow-600 font-semibold"
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
};
