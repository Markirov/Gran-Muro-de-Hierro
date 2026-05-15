# ============================================================
# Descarga de imágenes WWI dominio público — Wikimedia Commons
# Para usar como placeholders en Warband Forge
# ============================================================
# Ejecutar desde PowerShell:
#   cd "E:\Drive\Trench Crusade"
#   .\descargar-placeholders-wwi.ps1
#
# Usa la API de Wikimedia para obtener thumbnails a 800px (CDN
# menos restrictivo que Special:FilePath en full-res), con
# User-Agent correcto y retry automático en caso de 429.
# ============================================================

$destino = Join-Path $PSScriptRoot "assets\wwi-placeholders"
if (-not (Test-Path $destino)) {
    New-Item -ItemType Directory -Path $destino | Out-Null
    Write-Host "Carpeta creada: $destino" -ForegroundColor Green
}

# User-Agent requerido por la política de Wikimedia
$headers = @{
    "User-Agent" = "WarbandForge-PlaceholderDownloader/1.0 (marcosfenollar@gmail.com)"
    "Accept"     = "image/jpeg,image/jpg,image/*"
}

# Función que consulta la API de Commons y devuelve la URL del thumbnail (800px)
function Get-WikiThumbUrl {
    param([string]$filename)
    $apiUrl = "https://commons.wikimedia.org/w/api.php?action=query&titles=File:$([Uri]::EscapeDataString($filename))&prop=imageinfo&iiprop=url|thumburl|thumbmime&iiurlwidth=800&format=json"
    try {
        $resp = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = $headers["User-Agent"] } -ErrorAction Stop
        $pages = $resp.query.pages
        $page  = $pages.PSObject.Properties | Select-Object -First 1 -ExpandProperty Value
        return $page.imageinfo[0].thumburl
    } catch {
        return $null
    }
}

# Función con retry para descargar un archivo
function Download-WithRetry {
    param([string]$url, [string]$ruta, [int]$maxRetries = 3)
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            Invoke-WebRequest -Uri $url -OutFile $ruta -Headers $headers -UseBasicParsing -ErrorAction Stop
            return $true
        } catch {
            $status = $_.Exception.Response.StatusCode.value__
            if ($status -eq 429) {
                $wait = $i * 5
                Write-Host "    429 rate limit — esperando ${wait}s (intento $i/$maxRetries)..." -ForegroundColor Yellow
                Start-Sleep -Seconds $wait
            } else {
                return $false
            }
        }
    }
    return $false
}

# ── LISTA DE IMÁGENES ─────────────────────────────────────────────────────────
# Todas son dominio público (fotografías anteriores a 1928 o publicadas
# por gobiernos, sin copyright). Fuente: Wikimedia Commons.

$imagenes = @(

    # ── SOLDADOS OTOMANOS ─────────────────────────────────────────────────
    @{ nombre = "otomano_ataturk_uniforme.jpg";
       archivo = "Ataturk_1.JPG" },

    @{ nombre = "otomano_kemal_postcard.jpg";
       archivo = "A_postcard_depicting_Mustafa_Kemal_as_a_Muslim_hero,_with_Ahmed_Sharif_as-Senussi_(left)_and_Saladin_(right).jpg" },

    @{ nombre = "otomano_ataturk_1907.jpg";
       archivo = "Ataturk2.JPG" },

    @{ nombre = "gallipoli_anzac_1915.jpg";
       archivo = "AWM_C01101_Australian_10th_Bn_Gallipoli_1915.JPG" },

    @{ nombre = "otomano_kemal5.jpg";
       archivo = "Ataturk5.JPG" },

    # ── SOLDADOS ALIADOS / OTROS ──────────────────────────────────────────
    @{ nombre = "soldado_frances_uniforme_temprano.jpg";
       archivo = "French_soldier_early_uniform_WWI.JPG" },

    @{ nombre = "soldado_frances.jpg";
       archivo = "French_soldier_WWI.JPG" },

    @{ nombre = "soldados_alemanes.jpg";
       archivo = "GermanSoldiers.JPG" },

    @{ nombre = "soldados_germano_austriacos_postal.jpg";
       archivo = "WWI_postcards_German_and_Austrian_soldiers.jpg" },

    @{ nombre = "armadura_escudo_aleman.jpg";
       archivo = "German_body_armor_and_shield_from_World_War_I.JPG" },

    @{ nombre = "uniforme_infanteria_alemana_1914.jpg";
       archivo = "Germany_infantry_uniform_August_1914_worn_by_soldier_in_118th_Infantry_Regiment_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07453.JPG" },

    @{ nombre = "ametrallador_aleman_acorazado.jpg";
       archivo = "Armouredgermanmachinegunnerworldwari.JPG" },

    # ── ARMAS Y EQUIPO ────────────────────────────────────────────────────
    @{ nombre = "ametralladora_vickers_gas.jpg";
       archivo = "Vickers_machine_gun_crew_with_gas_masks.jpg" },

    @{ nombre = "artilleria_britanica_accion.jpg";
       archivo = "British_artillery_in_action,_World_War_I.JPEG" },

    @{ nombre = "ametralladoras_museo.jpg";
       archivo = "Machine_guns_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07548.JPG" },

    @{ nombre = "vickers_hmg.jpg";
       archivo = "Vickers_Machine_Gun_YORCM_CA78ac.JPG" },

    @{ nombre = "mortero_trinchera_aleman_1916.jpg";
       archivo = "Germany_24.5_cm_New_Model_Heavy_Trench_Mortar_(Minenwerfer),_Model_1916_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07525.JPG" },

    @{ nombre = "municion_rifle.jpg";
       archivo = "WWI_rifle_ammunition.JPG" },

    @{ nombre = "proyectiles_artilleria.jpg";
       archivo = "WWI_shells.JPG" },

    @{ nombre = "maxim_mg_1.jpg";
       archivo = "Maxim_maching_gun_IMG_6379.JPG" },

    @{ nombre = "maxim_mg_2.jpg";
       archivo = "Maxim_maching_gun_IMG_6382.JPG" },

    @{ nombre = "maxim_wz1910.jpg";
       archivo = "MWP_Maxim_wz1910.JPG" },

    # ── TRINCHERAS Y ESCENARIOS ───────────────────────────────────────────
    @{ nombre = "trinchera_aerea_primera_guerra.jpg";
       archivo = "Aerial_photo,_First_World_War,_trench,_bird's_eye_view_Fortepan_31771.jpg" },

    @{ nombre = "no_mans_land_cullen.jpg";
       archivo = "Maurice_Galbraith_Cullen_-_No_Man's_Land.jpg" },

    @{ nombre = "porra_asalto_trinchera.jpg";
       archivo = "Crudely_shaped_trench_club_from_World_War_One_-_YORCM1960_145_8.JPG" }
)

# ── DESCARGA ──────────────────────────────────────────────────────────────────
$ok = 0; $skip = 0; $err = 0

Write-Host ""
Write-Host "Descargando $($imagenes.Count) imágenes WWI (thumbnails 800px via API)..." -ForegroundColor Cyan
Write-Host ""

foreach ($img in $imagenes) {
    $ruta = Join-Path $destino $img.nombre

    if (Test-Path $ruta) {
        Write-Host "  SKIP  $($img.nombre)" -ForegroundColor DarkGray
        $skip++; $ok++
        continue
    }

    # Paso 1: obtener URL del thumbnail via API
    Write-Host "  API   $($img.archivo)..." -ForegroundColor DarkGray -NoNewline
    $thumbUrl = Get-WikiThumbUrl -filename $img.archivo
    Start-Sleep -Milliseconds 500

    if (-not $thumbUrl) {
        Write-Host " sin URL" -ForegroundColor Red
        $err++
        continue
    }
    Write-Host " OK" -ForegroundColor DarkGray

    # Paso 2: descargar el thumbnail
    $result = Download-WithRetry -url $thumbUrl -ruta $ruta
    Start-Sleep -Milliseconds 800

    if ($result) {
        $size = [math]::Round((Get-Item $ruta).Length / 1KB)
        Write-Host "  OK    $($img.nombre) (${size}KB)" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "  ERR   $($img.nombre)" -ForegroundColor Red
        if (Test-Path $ruta) { Remove-Item $ruta }
        $err++
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Descargados: $ok / $($imagenes.Count)  ($skip ya existían)" -ForegroundColor $(if ($err -eq 0) { "Green" } else { "Yellow" })
if ($err -gt 0) {
    Write-Host "  Errores:     $err" -ForegroundColor Red
    Write-Host "  (Algunos archivos pueden haber cambiado de nombre en Commons)" -ForegroundColor DarkGray
}
Write-Host "  Carpeta:     $destino" -ForegroundColor Cyan
Write-Host ""
