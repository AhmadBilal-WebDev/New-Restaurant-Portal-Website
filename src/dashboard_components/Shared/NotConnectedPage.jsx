'use client';

export function NotConnectedPage({ title = 'Section' }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-2">
        <h2 className="text-lg font-bold text-white capitalize">{title}</h2>
        <p className="text-sm text-neutral-400">
          This section is available in your sidebar but the page is not connected yet.
        </p>
      </div>
    </div>
  );
}
