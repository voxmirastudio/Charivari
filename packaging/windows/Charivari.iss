; Charivari — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE)
; Inno Setup script for the Windows installer: the CLAP and the VST3 (64-bit) in Common Files, for every user, with an
; uninstaller. Built by .github/workflows/build.yml:  ISCC /DAppVersion=1.0.1 /DStage=<folder> Charivari.iss
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef Stage
  #define Stage "stage"
#endif
[Setup]
AppId={{B5305CA1-4D56-5EDD-849F-7D3097BD338F}
AppName=Charivari
AppVersion={#AppVersion}
AppVerName=Charivari {#AppVersion}
AppPublisher=Vox Mira Studio
AppCopyright=Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio
DefaultDirName={commonpf64}\Vox Mira Studio\Charivari
DisableDirPage=yes
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
MinVersion=10.0
OutputDir=.
OutputBaseFilename=Charivari-{#AppVersion}-Windows-x64-Setup
InfoBeforeFile={#Stage}\CREDITS.md
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Charivari {#AppVersion} (CLAP, VST3)

[Files]
Source: "{#Stage}\Charivari.clap"; DestDir: "{commoncf64}\CLAP"; Flags: ignoreversion
Source: "{#Stage}\Charivari.vst3\*"; DestDir: "{commoncf64}\VST3\Charivari.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#Stage}\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Stage}\CREDITS.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Stage}\licences\*"; DestDir: "{app}\licences"; Flags: ignoreversion

[Messages]
FinishedLabel=Charivari is installed: the CLAP in Common Files\CLAP, the VST3 in Common Files\VST3. Rescan your plugins in your host.
