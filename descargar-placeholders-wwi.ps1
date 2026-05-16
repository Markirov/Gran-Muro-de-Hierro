# ================================================================
# Descarga de imágenes WWI dominio público — Warband Forge
# ================================================================
# FUENTES:
#   1. Wikimedia Commons  — API thumbnail (800px) + scrape por categoría
#   2. Library of Congress — API JSON, búsqueda dinámica
#   3. Australian War Memorial — URLs directas de colección
#
# INSTRUCCIONES:
#   cd "E:\Drive\Trench Crusade"
#   .\descargar-placeholders-wwi.ps1
#
# El script saltará archivos ya descargados (reanudar seguro).
# ================================================================

$destino = Join-Path $PSScriptRoot "assets\wwi-placeholders"
if (-not (Test-Path $destino)) {
    New-Item -ItemType Directory -Path $destino | Out-Null
    Write-Host "Carpeta creada: $destino" -ForegroundColor Green
}

$UA = "WarbandForge-PlaceholderDownloader/1.0 (marcosfenollar@gmail.com)"
$wikiHeaders = @{ "User-Agent" = $UA }
$global:ok = 0; $global:skip = 0; $global:err = 0

# ── UTILIDADES ────────────────────────────────────────────────────────────────

function Save-File {
    param([string]$url, [string]$nombre, [hashtable]$hdrs = @{})
    $ruta = Join-Path $destino $nombre
    if (Test-Path $ruta) {
        Write-Host "  SKIP  $nombre" -ForegroundColor DarkGray
        $global:skip++; $global:ok++; return
    }
    for ($i = 1; $i -le 3; $i++) {
        try {
            $h = @{ "User-Agent" = $UA } + $hdrs
            Invoke-WebRequest -Uri $url -OutFile $ruta -Headers $h -UseBasicParsing -EA Stop
            $kb = [math]::Round((Get-Item $ruta).Length / 1KB)
            Write-Host "  OK    $nombre  (${kb}KB)" -ForegroundColor Green
            $global:ok++; return
        } catch {
            $code = $_.Exception.Response.StatusCode.value__
            if ($code -eq 429) {
                $wait = $i * 6
                Write-Host "    429 — espera ${wait}s..." -ForegroundColor Yellow
                Start-Sleep -Seconds $wait
            } else {
                Write-Host "  ERR   $nombre  [$code] $($_.Exception.Message)" -ForegroundColor Red
                if (Test-Path $ruta) { Remove-Item $ruta }
                $global:err++; return
            }
        }
    }
    Write-Host "  ERR   $nombre  (3 reintentos agotados)" -ForegroundColor Red
    if (Test-Path $ruta) { Remove-Item $ruta }
    $global:err++
}

function Get-WikiThumbUrl {
    param([string]$filename)
    $api = "https://commons.wikimedia.org/w/api.php?action=query&titles=File:$([Uri]::EscapeDataString($filename))&prop=imageinfo&iiprop=thumburl&iiurlwidth=800&format=json"
    try {
        $r = Invoke-RestMethod -Uri $api -Headers $wikiHeaders -EA Stop
        $p = $r.query.pages.PSObject.Properties | Select-Object -First 1 -ExpandProperty Value
        return $p.imageinfo[0].thumburl
    } catch { return $null }
}

function Download-WikiFile {
    param([string]$archivo, [string]$nombre)
    Write-Host "  ···   $archivo" -ForegroundColor DarkGray -NoNewline
    $thumb = Get-WikiThumbUrl -filename $archivo
    Start-Sleep -Milliseconds 400
    if (-not $thumb) { Write-Host "  [sin URL]" -ForegroundColor Red; $global:err++; return }
    Write-Host ""
    Save-File -url $thumb -nombre $nombre
    Start-Sleep -Milliseconds 700
}

# ── FUENTE 1: WIKIMEDIA COMMONS — LISTA CONFIRMADA ───────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  WIKIMEDIA COMMONS — archivos confirmados" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

$wiki_confirmados = @(
    # SOLDADOS OTOMANOS
    @{ n="ot_ataturk_uniforme_militar.jpg";    a="Ataturk_1.JPG" },
    @{ n="ot_kemal_postal_heroe.jpg";          a="A_postcard_depicting_Mustafa_Kemal_as_a_Muslim_hero,_with_Ahmed_Sharif_as-Senussi_(left)_and_Saladin_(right).jpg" },
    @{ n="ot_ataturk_1907.jpg";                a="Ataturk2.JPG" },
    @{ n="ot_ataturk_5.jpg";                   a="Ataturk5.JPG" },
    @{ n="ot_gallipoli_trinchera_periscope.jpg"; a="Soldiers_in_a_trench_using_a_periscope_rifle,_Gallipoli,_Turkey,_1915_(3466808478).jpg" },
    @{ n="ot_gallipoli_anzac_playa.jpg";       a="AWM_C01101_Australian_10th_Bn_Gallipoli_1915.JPG" },

    # SOLDADOS ALIADOS / OTROS
    @{ n="fr_soldado_uniforme_temprano.jpg";   a="French_soldier_early_uniform_WWI.JPG" },
    @{ n="fr_soldado.jpg";                     a="French_soldier_WWI.JPG" },
    @{ n="de_soldados_grupo.jpg";              a="GermanSoldiers.JPG" },
    @{ n="de_at_postal_soldados.jpg";          a="WWI_postcards_German_and_Austrian_soldiers.jpg" },
    @{ n="de_armadura_escudo.jpg";             a="German_body_armor_and_shield_from_World_War_I.JPG" },
    @{ n="de_uniforme_infanteria_1914.jpg";    a="Germany_infantry_uniform_August_1914_worn_by_soldier_in_118th_Infantry_Regiment_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07453.JPG" },
    @{ n="de_ametrallador_acorazado.jpg";      a="Armouredgermanmachinegunnerworldwari.JPG" },
    @{ n="rs_equipo_infanteria.jpg";           a="Serbian_WWI_army_equipment.JPG" },
    @{ n="ru_hospital_militar.jpg";            a="Palace_Military_Hospital_(Russia,_WW1).jpg" },

    # AMETRALLADORAS Y ARTILLERÍA
    @{ n="mg_vickers_crew_gas.jpg";            a="Vickers_machine_gun_crew_with_gas_masks.jpg" },
    @{ n="mg_vickers_hmg.jpg";                 a="Vickers_Machine_Gun_YORCM_CA78ac.JPG" },
    @{ n="mg_museo_wwi.jpg";                   a="Machine_guns_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07548.JPG" },
    @{ n="mg_maxim_1.jpg";                     a="Maxim_maching_gun_IMG_6379.JPG" },
    @{ n="mg_maxim_2.jpg";                     a="Maxim_maching_gun_IMG_6382.JPG" },
    @{ n="mg_maxim_wz1910.jpg";                a="MWP_Maxim_wz1910.JPG" },
    @{ n="art_britanica_accion.jpg";           a="British_artillery_in_action,_World_War_I.JPEG" },
    @{ n="art_mortero_trinchera_de_1916.jpg";  a="Germany_24.5_cm_New_Model_Heavy_Trench_Mortar_(Minenwerfer),_Model_1916_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07525.JPG" },

    # MUNICIÓN Y ARMAMENTO
    @{ n="arma_municion_rifle.jpg";            a="WWI_rifle_ammunition.JPG" },
    @{ n="arma_proyectiles.jpg";               a="WWI_shells.JPG" },
    @{ n="arma_obuses_150.jpg";                a="150_H_14_J_shell.JPG" },
    @{ n="arma_obuses_155_1.jpg";              a="155_H_17_shell.JPG" },
    @{ n="arma_obuses_155_2.jpg";              a="155_H_17_shell_2.JPG" },
    @{ n="arma_mortero_aleman_420mm.jpg";      a="German_mortar_shell._420_M.M.JPG" },
    @{ n="arma_uxo_1918.jpg";                  a="1918_German_UXOs1.JPG" },

    # MÁSCARAS DE GAS
    @{ n="gas_mascara_uk.jpg";                 a="UK_gas_mask_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07570.JPG" },
    @{ n="gas_mascara_de_1917.jpg";            a="Germany_gas_mask,_Model_1917_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07567.JPG" },
    @{ n="gas_mascara_fr_1917.jpg";            a="France_gas_mask_canister,_Small_Tissot_Model_1917_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07564.JPG" },
    @{ n="gas_mascara_caballo.jpg";            a="World_War_One_Horse_Gas_Mask_YORCM_TM303.JPG" },

    # TRINCHERAS Y ESCENARIOS
    @{ n="trench_foto_aerea.jpg";              a="Aerial_photo,_First_World_War,_trench,_bird's_eye_view_Fortepan_31771.jpg" },
    @{ n="trench_no_mans_land_pintura.jpg";    a="Maurice_Galbraith_Cullen_-_No_Man's_Land.jpg" },
    @{ n="trench_porra_asalto_1.jpg";          a="Crudely_shaped_trench_club_from_World_War_One_-_YORCM1960_145_8.JPG" },
    @{ n="trench_porra_asalto_2.jpg";          a="World_War_One_trench_raiding_club.JPG" },

    # TANQUES Y VEHÍCULOS
    @{ n="tank_iwm_museum.jpg";                a="Tank,_Imperial_War_Museum,_London_-_DSC05386.JPG" }
)

foreach ($img in $wiki_confirmados) {
    Download-WikiFile -archivo $img.a -nombre $img.n
}

# ── FUENTE 1b: WIKIMEDIA COMMONS — SCRAPE DE CATEGORÍAS ─────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  WIKIMEDIA COMMONS — scrape de categorías" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

$categorias = @(
    @{ cat = "World_War_I_forces_of_the_Ottoman_Empire"; prefijo = "cat_ot_";  limite = 20 },
    @{ cat = "World_War_I_trench_warfare";               prefijo = "cat_tr_";  limite = 20 },
    @{ cat = "Infantry_weapons_of_World_War_I";          prefijo = "cat_wep_"; limite = 20 },
    @{ cat = "World_War_I_artillery_of_the_Ottoman_Empire"; prefijo = "cat_ot_art_"; limite = 10 },
    @{ cat = "Photographs_of_soldiers_in_World_War_I";   prefijo = "cat_sol_"; limite = 20 }
)

foreach ($cat in $categorias) {
    Write-Host ""
    Write-Host "  Categoría: $($cat.cat)" -ForegroundColor DarkCyan

    # Obtener lista de archivos de la categoría
    $apiCat = "https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:$([Uri]::EscapeDataString($cat.cat))&cmtype=file&cmlimit=$($cat.limite)&format=json"
    try {
        $resp = Invoke-RestMethod -Uri $apiCat -Headers $wikiHeaders -EA Stop
        $archivos = $resp.query.categorymembers
        Write-Host "    $($archivos.Count) archivos encontrados" -ForegroundColor DarkGray
        Start-Sleep -Milliseconds 400

        $idx = 1
        foreach ($archivo in $archivos) {
            # Extraer nombre limpio del archivo (quitar "File:")
            $fname = $archivo.title -replace '^File:', ''

            # Omitir no-imágenes (svg, webm, ogv, pdf)
            if ($fname -match '\.(svg|webm|ogv|pdf|ogg|mp4|wav)$') { continue }

            # Nombre local: prefijo + índice + extensión
            $ext = [System.IO.Path]::GetExtension($fname).ToLower()
            if ($ext -eq '') { $ext = '.jpg' }
            $nombre = "$($cat.prefijo)$('{0:D3}' -f $idx)$ext"
            $idx++

            Download-WikiFile -archivo $fname -nombre $nombre
        }
    } catch {
        Write-Host "  ERR categoría $($cat.cat): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ── FUENTE 2: LIBRARY OF CONGRESS ────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  LIBRARY OF CONGRESS — búsqueda dinámica" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

$loc_busquedas = @(
    @{ q = "world war ottoman soldiers gallipoli";  prefijo = "loc_ot_";  n = 10 },
    @{ q = "world war trench soldiers western front"; prefijo = "loc_tr_"; n = 10 },
    @{ q = "world war machine gun artillery soldiers"; prefijo = "loc_mg_"; n = 10 },
    @{ q = "world war soldiers uniform weapons";     prefijo = "loc_sol_"; n = 10 }
)

foreach ($busq in $loc_busquedas) {
    Write-Host ""
    Write-Host "  LoC query: '$($busq.q)'" -ForegroundColor DarkCyan

    $qEnc   = [Uri]::EscapeDataString($busq.q)
    $locApi = "https://www.loc.gov/search/?q=$qEnc&fo=json&fa=online-format:image&c=$($busq.n)&at=results"

    try {
        $resp = Invoke-RestMethod -Uri $locApi -Headers @{ "User-Agent" = $UA } -EA Stop
        $items = $resp.results
        Write-Host "    $($items.Count) resultados" -ForegroundColor DarkGray
        Start-Sleep -Milliseconds 600

        $idx = 1
        foreach ($item in $items) {
            # Buscar URL de imagen descargable en image_url o resources
            $imgUrl = $null

            # Intentar image_url (array de tamaños, preferir la mediana)
            if ($item.image_url) {
                $urls = @($item.image_url)
                # LoC devuelve tamaños; buscar algo con /service/pnp/
                $imgUrl = $urls | Where-Object { $_ -match '/service/pnp/' } | Select-Object -Last 1
                if (-not $imgUrl) { $imgUrl = $urls | Select-Object -Last 1 }
            }

            # Intentar resources[].files con format jpeg
            if (-not $imgUrl -and $item.resources) {
                foreach ($res in $item.resources) {
                    if ($res.files) {
                        $jpgFile = $res.files | Where-Object { $_.mimetype -eq 'image/jpeg' } | Select-Object -Last 1
                        if ($jpgFile) { $imgUrl = $jpgFile.url; break }
                    }
                }
            }

            if (-not $imgUrl) { continue }

            $nombre = "$($busq.prefijo)$('{0:D3}' -f $idx).jpg"
            $idx++

            Save-File -url $imgUrl -nombre $nombre
            Start-Sleep -Milliseconds 800
        }
    } catch {
        Write-Host "  ERR LoC '$($busq.q)': $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ── FUENTE 3: AUSTRALIAN WAR MEMORIAL ────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AUSTRALIAN WAR MEMORIAL — colección Gallipoli" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

# AWM ofrece descarga libre de baja resolución. IDs conocidos de Gallipoli/frente otomano.
# URL pattern: https://www.awm.gov.au/images/collection/ACCESSION/screen/ACCESSION.JPG
$awm_ids = @(
    @{ id = "H03500";  n = "awm_gallipoli_playa_anzac.jpg" },
    @{ id = "A02770";  n = "awm_gallipoli_a02770.jpg" },
    @{ id = "P00419.001"; n = "awm_gallipoli_p00419.jpg" },
    @{ id = "C01372";  n = "awm_gallipoli_c01372.jpg" },
    @{ id = "H10363";  n = "awm_gallipoli_h10363.jpg" },
    @{ id = "A03622";  n = "awm_gallipoli_a03622.jpg" },
    @{ id = "A03623";  n = "awm_gallipoli_a03623.jpg" },
    @{ id = "A03624";  n = "awm_gallipoli_a03624.jpg" },
    @{ id = "H19171";  n = "awm_gallipoli_trinchera.jpg" },
    @{ id = "P02462.006"; n = "awm_gallipoli_p02462.jpg" }
)

foreach ($awm in $awm_ids) {
    $id  = $awm.id
    $url = "https://www.awm.gov.au/images/collection/$id/screen/$id.JPG"
    Save-File -url $url -nombre $awm.n
    Start-Sleep -Milliseconds 500
}

# ── RESUMEN FINAL ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
$total = $global:ok + $global:err
Write-Host "  Total procesado : $total" -ForegroundColor White
Write-Host "  Descargados     : $global:ok  ($global:skip ya existían)" -ForegroundColor $(if ($global:err -eq 0) { "Green" } else { "Yellow" })
if ($global:err -gt 0) {
    Write-Host "  Errores         : $global:err" -ForegroundColor Red
}
$archivos = (Get-ChildItem $destino -File).Count
Write-Host "  Archivos en carpeta: $archivos" -ForegroundColor White
Write-Host "  Carpeta: $destino" -ForegroundColor Cyan
Write-Host ""
