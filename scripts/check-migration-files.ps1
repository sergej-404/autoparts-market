# Read-only migration check. Does not connect to or modify Neon.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$directory = Join-Path $projectRoot 'prisma\migrations'
$knownMissing = @(
  '20261014000000_email_otp',
  '20261019000000_add_admin_system_data',
  '20261019010000_remove_seeded_demo_data',
  '20261019020000_add_user_public_id',
  '20261029150000_partner_program'
)
$files = @(Get-ChildItem -Path $directory -Filter 'migration.sql' -File -Recurse)
Write-Host "Local migrations: $($files.Count)"
foreach ($migration in $knownMissing) {
  $path = Join-Path (Join-Path $directory $migration) 'migration.sql'
  if (Test-Path $path) { Write-Host "PRESENT: $migration" }
  else { Write-Warning "MISSING (applied in production Neon): $migration" }
}
$chatPath = Join-Path $directory '20261021100000_persistent_chats_public_user_id\migration.sql'
if (Test-Path $chatPath) {
  $hash = (Get-FileHash -LiteralPath $chatPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $expected = '19cb430ba1bf3d823cad3390cd995a6424f062a733e355be572cbd3ef9fb98a7'
  Write-Host "Chat migration file SHA256: $hash"
  if ($hash -eq $expected) { Write-Host 'PASS: matches successful Neon migration checksum' }
  else { Write-Warning 'MISMATCH: do not edit migration without investigation' }
}
Write-Host 'Read-only check complete. No database changes made.'
