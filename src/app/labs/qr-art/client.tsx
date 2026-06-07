"use client";

import { QRArtGenerator } from "@alexkafer/qr-art";

export default function QRArtClient() {
  return (
    <div className="rounded-2xl border border-mute-700/50 bg-void-800/50 p-4 md:p-8">
      <QRArtGenerator
        defaultUrl="https://robynandalex.com/"
        defaultVersion={5}
        defaultEcLevel="L"
        showModuleMap={false}
      />
    </div>
  );
}
