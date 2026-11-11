$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '../..')
try {
    $models = @(Get-ChildItem -LiteralPath models -Filter '*.onnx' -File)
    if ($models.Count -eq 0) { throw 'No models/*.onnx found. Export the models first.' }
    & gh release view models-v1 --repo CGSudo/glance-attention *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Create the models-v1 release in CGSudo/glance-attention first.' }
    $modelPaths = @($models.FullName)
    & gh release upload models-v1 @modelPaths --repo CGSudo/glance-attention
    if ($LASTEXITCODE -ne 0) { throw 'Model upload failed. Existing assets require explicit removal before retrying.' }
} finally {
    Pop-Location
}
