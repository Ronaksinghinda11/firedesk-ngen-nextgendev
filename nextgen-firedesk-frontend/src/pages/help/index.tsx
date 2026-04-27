import Link from "next/link";

export default function HelpIndexPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-3">Help Center</h1>
      <p className="text-gray-700">
        Select a module below to view its guide. If you reached here from a
        broken link, use these quick links:
      </p>
      <ul className="list-disc pl-5 mt-4 text-blue-700">
        <li>
          <Link href="/help/assets">Assets</Link>
        </li>
        <li>
          <Link href="/help/plants">Plants</Link>
        </li>
        <li>
          <Link href="/help/service-forms">Service Forms</Link>
        </li>
      </ul>
    </div>
  );
}
