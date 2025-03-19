#!/usr/bin/env sh
echo --% >/dev/null;: ' | out-null
<#'

#
# for not-Windows operating systems
#
deno run --allow-net --allow-read --allow-write --allow-run --allow-sys https://raw.githubusercontent.com/jeff-hykin/archaeopteryx/80316971344a78b32f60708134ecc850b8083102/mod.ts dist/

exit #>

#
# for windows (powershell)
#
deno run --allow-net --allow-read --allow-write --allow-run --allow-sys https://raw.githubusercontent.com/jeff-hykin/archaeopteryx/80316971344a78b32f60708134ecc850b8083102/mod.ts dist/