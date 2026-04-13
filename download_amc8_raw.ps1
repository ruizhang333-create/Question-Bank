$ErrorActionPreference = "Stop"

$years = 2011..2025 | Where-Object { $_ -ne 2021 }
$root = Join-Path $PSScriptRoot "amc8_raw"

New-Item -ItemType Directory -Force -Path $root | Out-Null

foreach ($year in $years) {
    $yearDir = Join-Path $root $year
    New-Item -ItemType Directory -Force -Path $yearDir | Out-Null

    $indexUrl = "https://artofproblemsolving.com/wiki/index.php?title=${year}_AMC_8&action=raw"
    $indexPath = Join-Path $yearDir "index.txt"
    curl.exe -s -L $indexUrl -o $indexPath

    $answerKeyUrl = "https://artofproblemsolving.com/wiki/index.php?title=${year}_AMC_8_Answer_Key&action=raw"
    $answerKeyPath = Join-Path $yearDir "Answer_Key.txt"
    curl.exe -s -L $answerKeyUrl -o $answerKeyPath

    foreach ($num in 1..25) {
        $problemUrl = "https://artofproblemsolving.com/wiki/index.php?title=${year}_AMC_8_Problems/Problem_${num}&action=raw"
        $problemPath = Join-Path $yearDir ("Problem_{0}.txt" -f $num)
        curl.exe -s -L $problemUrl -o $problemPath
    }
}
