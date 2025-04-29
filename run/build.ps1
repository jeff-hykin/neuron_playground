#!/usr/bin/env sh
"\"",`$(echo --% ' |out-null)" >$null;function :{};function dv{<#${/*'>/dev/null )` 2>/dev/null;dv() { #>
echo "2.2.11"; : --% ' |out-null <#'; }; deno_version="$(dv)"; deno="$HOME/.deno/$deno_version/bin/deno"; if [ -x "$deno" ];then  exec "$deno" run -q -A --no-lock --no-config "$0" "$@";  elif [ -f "$deno" ]; then  chmod +x "$deno" && exec "$deno" run -q -A --no-lock --no-config "$0" "$@"; fi; has () { command -v "$1" >/dev/null; };  set -e;  if ! has unzip && ! has 7z; then echo "Can I try to install unzip for you? (its required for this command to work) ";read ANSWER;echo;  if [ "$ANSWER" =~ ^[Yy] ]; then  if ! has brew; then  brew install unzip; elif has apt-get; then if [ "$(whoami)" = "root" ]; then  apt-get install unzip -y; elif has sudo; then  echo "I'm going to try sudo apt install unzip";read ANSWER;echo;  sudo apt-get install unzip -y;  elif has doas; then  echo "I'm going to try doas apt install unzip";read ANSWER;echo;  doas apt-get install unzip -y;  else apt-get install unzip -y;  fi;  fi;  fi;   if ! has unzip; then  echo ""; echo "So I couldn't find an 'unzip' command"; echo "And I tried to auto install it, but it seems that failed"; echo "(This script needs unzip and either curl or wget)"; echo "Please install the unzip command manually then re-run this script"; exit 1;  fi;  fi;   if ! has unzip && ! has 7z; then echo "Error: either unzip or 7z is required to install Deno (see: https://github.com/denoland/deno_install#either-unzip-or-7z-is-required )." 1>&2; exit 1; fi;  if [ "$OS" = "Windows_NT" ]; then target="x86_64-pc-windows-msvc"; else case $(uname -sm) in "Darwin x86_64") target="x86_64-apple-darwin" ;; "Darwin arm64") target="aarch64-apple-darwin" ;; "Linux aarch64") target="aarch64-unknown-linux-gnu" ;; *) target="x86_64-unknown-linux-gnu" ;; esac fi;  print_help_and_exit() { echo "Setup script for installing deno  Options: -y, --yes Skip interactive prompts and accept defaults --no-modify-path Don't add deno to the PATH environment variable -h, --help Print help " echo "Note: Deno was not installed"; exit 0; };  for arg in "$@"; do case "$arg" in "-h") print_help_and_exit ;; "--help") print_help_and_exit ;; "-"*) ;; *) if [ -z "$deno_version" ]; then deno_version="$arg"; fi ;; esac done; if [ -z "$deno_version" ]; then deno_version="$(curl -s https://dl.deno.land/release-latest.txt)"; fi;  deno_uri="https://dl.deno.land/release/v${deno_version}/deno-${target}.zip"; deno_install="${DENO_INSTALL:-$HOME/.deno/$deno_version}"; bin_dir="$deno_install/bin"; exe="$bin_dir/deno";  if [ ! -d "$bin_dir" ]; then mkdir -p "$bin_dir"; fi;  if has curl; then curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"; elif has wget; then wget --output-document="$exe.zip" "$deno_uri"; else echo "Error: curl or wget is required to download Deno (see: https://github.com/denoland/deno_install )." 1>&2; fi;  if has unzip; then unzip -d "$bin_dir" -o "$exe.zip"; else 7z x -o"$bin_dir" -y "$exe.zip"; fi; chmod +x "$exe"; rm "$exe.zip";  exec "$deno" run -q -A --no-lock --no-config "$0" "$@";     #>}; $DenoInstall = "${HOME}/.deno/$(dv)"; $BinDir = "$DenoInstall/bin"; $DenoExe = "$BinDir/deno.exe"; if (-not(Test-Path -Path "$DenoExe" -PathType Leaf)) { $DenoZip = "$BinDir/deno.zip"; $DenoUri = "https://github.com/denoland/deno/releases/download/v$(dv)/deno-x86_64-pc-windows-msvc.zip";  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;  if (!(Test-Path $BinDir)) { New-Item $BinDir -ItemType Directory | Out-Null; };  Function Test-CommandExists { Param ($command); $oldPreference = $ErrorActionPreference; $ErrorActionPreference = "stop"; try {if(Get-Command "$command"){RETURN $true}} Catch {Write-Host "$command does not exist"; RETURN $false}; Finally {$ErrorActionPreference=$oldPreference}; };  if (Test-CommandExists curl) { curl -Lo $DenoZip $DenoUri; } else { curl.exe -Lo $DenoZip $DenoUri; };  if (Test-CommandExists curl) { tar xf $DenoZip -C $BinDir; } else { tar -Lo $DenoZip $DenoUri; };  Remove-Item $DenoZip;  $User = [EnvironmentVariableTarget]::User; $Path = [Environment]::GetEnvironmentVariable('Path', $User); if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) { [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User); $Env:Path += ";$BinDir"; } }; & "$DenoExe" run -q -A --no-lock --no-config "$PSCommandPath" @args; Exit $LastExitCode; <# 
# */0}`;

// import $ from "https://esm.sh/jsr/@david/dax@0.42.0/mod.ts"
import $ from "https://esm.sh/@jsr/david__dax@0.43.0/mod.ts"
const $$ = (...args)=>$(...args).noThrow()
// await $$`false`
// await $$`false`.text("stderr")
import { FileSystem, glob } from "https://deno.land/x/quickr@0.8.0/main/file_system.js"
import { listAllJsPaths } from "https://esm.sh/gh/jeff-hykin/html-bundle@60dd65d/main/pure_api.js"
// import { listAllJsPaths } from "/Users/jeffhykin/repos/html-bundle/main/pure_api.js"
const mainHtmlFilePath = Deno.args[0] || `${FileSystem.thisFolder}/../index.html`
const targetFolder = `${FileSystem.thisFolder}/../dist`
const viteArgs = [
    "--target", "esnext",
    "--mode", "production",
    "--minify",
]
await FileSystem.remove(`${targetFolder}/index.html`)
await FileSystem.copy({ from: mainHtmlFilePath, to: `${targetFolder}/index.html`, overwrite: true })

// bundle the https imports manually cause vite is dumb
import { bundle } from "https://esm.sh/gh/jeff-hykin/deno_bundle@d8e39b0/api.js"
const html = await FileSystem.read(mainHtmlFilePath)
const jsPaths = new Set([...listAllJsPaths(html)])

for (let eachPath of jsPaths) {
    // only create copies of local files
    if (!eachPath.match(/https?:/)) {
        if (FileSystem.isAbsolutePath(eachPath)) {
            console.error(`bundling absolute paths are not supported yet: ${eachPath}`)
            continue
        }
        const relativePath = eachPath
        const fullPath = `${FileSystem.parentPath(mainHtmlFilePath)}/${eachPath}`
        console.log(`bundling ${relativePath}`)
        await bundle(fullPath, {outfile: `${targetFolder}/${relativePath}`})
        console.log(`bundled ${relativePath}`)
    }
}
// Then use vite
await $$`deno run -A 'https://esm.sh/gh/jeff-hykin/bite@5.4.10.2/vite/bin/vite.js' build ${targetFolder} ${viteArgs} --outDir ${`${FileSystem.thisFolder}/../docs`} --emptyOutDir`
// then bundle the html
await $$`deno run -A https://esm.sh/gh/jeff-hykin/html-bundle@0.0.3.0/main/html-bundle.js --inplace ${`${FileSystem.thisFolder}/../docs/index.html`}`

// (this comment is part of deno-guillotine, dont remove) #>