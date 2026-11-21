$ErrorActionPreference = "Stop"

$AliasName = "jbae-release-2026"
$BackupDirectory = Join-Path $env:USERPROFILE "JBAE-signing-backup"
$KeystorePath = Join-Path $BackupDirectory "jbae-release.p12"

if (Test-Path -LiteralPath $KeystorePath) {
    throw "The keystore already exists at $KeystorePath. Do not overwrite it; preserve the existing signing identity."
}

$KeytoolCommand = Get-Command keytool.exe -ErrorAction SilentlyContinue
if ($KeytoolCommand) {
    $KeytoolPath = $KeytoolCommand.Source
} else {
    $Candidates = @(
        (Join-Path $env:ProgramFiles "Android\Android Studio\jbr\bin\keytool.exe"),
        "C:\Program Files\Java\jdk-21\bin\keytool.exe"
    )
    $KeytoolPath = $Candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $KeytoolPath) {
    throw "keytool.exe was not found. Install Android Studio (with its bundled JBR) or JDK 21, then run this script again."
}

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$SecurePassword = Read-Host "Create a strong JBAE keystore password (at least 20 characters)" -AsSecureString
$PasswordPointer = [IntPtr]::Zero
$Password = $null
$Base64 = $null

try {
    $PasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($PasswordPointer)
    if ($Password.Length -lt 20) {
        throw "The password must contain at least 20 characters."
    }

    & $KeytoolPath -genkeypair -v -storetype PKCS12 -keystore $KeystorePath -storepass $Password -keypass $Password -alias $AliasName -keyalg RSA -keysize 3072 -validity 10000 -dname "CN=JBAE Android Release, OU=JBAE, O=JB TECH, L=Granada, ST=Granada, C=NI"
    if ($LASTEXITCODE -ne 0) {
        throw "keytool failed while generating the keystore."
    }

    $KeyInfo = & $KeytoolPath -list -v -storetype PKCS12 -keystore $KeystorePath -storepass $Password -alias $AliasName
    if ($LASTEXITCODE -ne 0) {
        throw "The generated keystore could not be reopened."
    }
    $ShaLine = $KeyInfo | Where-Object { $_ -match '^\s*SHA256:' } | Select-Object -First 1
    $Fingerprint = ($ShaLine -replace '^\s*SHA256:\s*', '' -replace ':', '' -replace '\s', '').ToUpperInvariant()
    if ($Fingerprint -notmatch '^[A-F0-9]{64}$') {
        throw "Could not extract the SHA-256 certificate fingerprint."
    }

    $Base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($KeystorePath))

    Write-Host ""
    Write-Host "JBAE signing key created successfully." -ForegroundColor Green
    Write-Host "Keystore backup: $KeystorePath"
    Write-Host "Alias: $AliasName"
    Write-Host "Certificate SHA-256: $Fingerprint"
    Write-Host ""
    Write-Host "1) The password is now in your clipboard. Save it in GitHub as secret:"
    Write-Host "   JBAE_ANDROID_KEYSTORE_PASSWORD"
    Set-Clipboard -Value $Password
    Read-Host "After saving that secret in GitHub, press Enter to copy the keystore"

    Set-Clipboard -Value $Base64
    Write-Host ""
    Write-Host "2) The Base64 keystore is now in your clipboard. Save it in GitHub as secret:"
    Write-Host "   JBAE_ANDROID_SIGNING_KEYSTORE_BASE64"
    Read-Host "After saving that secret in GitHub, press Enter to clear the clipboard"

    Set-Clipboard -Value ""
    Write-Host ""
    Write-Host "Keep the .p12 file in at least one additional encrypted/offline backup." -ForegroundColor Yellow
    Write-Host "Never upload the .p12 file or Base64 string to a repository, issue, or chat."
} finally {
    if ($PasswordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($PasswordPointer)
    }
    $Password = $null
    $Base64 = $null
}
