export function AfterEventData() {
  return (
    <details className="mt-5 border-y border-border py-2">
      <summary className="min-h-12 cursor-pointer content-center text-[17px] font-semibold">
        Your data after the event
      </summary>
      <dl className="divide-y divide-border text-[15px]">
        {[
          [
            "Private landmark pin",
            "Expires after 60 minutes, or two hours after the event ends, whichever comes first. Expired pins are removed when the app is open.",
          ],
          [
            "Saved meetup & imported plans",
            "Stay in this browser until you remove them or clear your data. Imported plans are saved copies.",
          ],
          [
            "Recap & downloaded cards",
            "Your saved record stays on this device. Files you download remain wherever you save or share them.",
          ],
          [
            "Landmark photo, ticket copy & photo diary",
            "Stored on this device until you remove them or clear saved data on this phone. Downloaded photos and cards stay wherever you save them.",
          ],
          [
            "Cloud crew chat & photos",
            "Crew chat, cloud photo albums and automated server deletion policies aren’t enabled yet.",
          ],
        ].map(([title, detail]) => (
          <div key={title} className="py-3">
            <dt className="font-semibold">{title}</dt>
            <dd className="mt-1 text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>
      <p className="my-3 text-[15px] text-muted-foreground">
        This PWA performs local cleanup while it is running, including when reopened. Browser
        storage can also be cleared in your browser settings. Previously shared copies remain with
        their recipients.
      </p>
    </details>
  );
}
