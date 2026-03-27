use base64::{engine::general_purpose::STANDARD, Engine};
use std::collections::BTreeMap;
use hmac::{Hmac, Mac};
use sha1::{Digest, Sha1};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Listener};

type HmacSha1 = Hmac<Sha1>;

// AES CBC PKCS7
fn encrypt_aes_cbc(key: &[u8], iv: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    if key.len() == 16 {
        type Aes128CbcEnc = cbc::Encryptor<aes::Aes128>;
        use cipher::KeyIvInit;
        use cipher::BlockEncryptMut;
        let pt = Aes128CbcEnc::new(key.into(), iv.into())
            .encrypt_padded_vec_mut::<cipher::block_padding::Pkcs7>(data);
        Ok(pt)
    } else if key.len() == 24 {
        type Aes192CbcEnc = cbc::Encryptor<aes::Aes192>;
        use cipher::KeyIvInit;
        use cipher::BlockEncryptMut;
        let pt = Aes192CbcEnc::new(key.into(), iv.into())
            .encrypt_padded_vec_mut::<cipher::block_padding::Pkcs7>(data);
        Ok(pt)
    } else if key.len() == 32 {
        type Aes256CbcEnc = cbc::Encryptor<aes::Aes256>;
        use cipher::KeyIvInit;
        use cipher::BlockEncryptMut;
        let pt = Aes256CbcEnc::new(key.into(), iv.into())
            .encrypt_padded_vec_mut::<cipher::block_padding::Pkcs7>(data);
        Ok(pt)
    } else {
        Err(format!("Invalid key length: {}", key.len()))
    }
}

fn decrypt_aes_cbc(key: &[u8], iv: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    use cipher::KeyIvInit;
    use cipher::BlockDecryptMut;
    if key.len() == 16 {
        type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;
        Aes128CbcDec::new(key.into(), iv.into())
            .decrypt_padded_vec_mut::<cipher::block_padding::Pkcs7>(data)
            .map_err(|e| format!("Decrypt error: {:?}", e))
    } else if key.len() == 24 {
        type Aes192CbcDec = cbc::Decryptor<aes::Aes192>;
        Aes192CbcDec::new(key.into(), iv.into())
            .decrypt_padded_vec_mut::<cipher::block_padding::Pkcs7>(data)
            .map_err(|e| format!("Decrypt error: {:?}", e))
    } else if key.len() == 32 {
        type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;
        Aes256CbcDec::new(key.into(), iv.into())
            .decrypt_padded_vec_mut::<cipher::block_padding::Pkcs7>(data)
            .map_err(|e| format!("Decrypt error: {:?}", e))
    } else {
        Err(format!("Invalid key length: {}", key.len()))
    }
}

pub struct RetrieveEncryptData {
    pub path: String,
    pub params: BTreeMap<String, Vec<u8>>,
    pub ssecurity: String,
}

impl RetrieveEncryptData {
    pub fn new(path: &str, ssecurity: &str) -> Self {
        Self {
            path: path.to_string(),
            params: BTreeMap::new(),
            ssecurity: ssecurity.to_string(),
        }
    }

    pub fn set_param(&mut self, key: &str, value: &str) {
        self.params.insert(key.to_string(), value.as_bytes().to_vec());
    }

    pub fn set_json_param(&mut self, key: &str, value: &serde_json::Value) {
        let json_str = serde_json::to_string(value).unwrap();
        let b64 = STANDARD.encode(json_str.as_bytes());
        self.params.insert(key.to_string(), b64.into_bytes());
    }

    fn getp(&self, sep: &str) -> Vec<u8> {
        let mut buf = Vec::new();
        buf.extend_from_slice(b"POST");
        buf.extend_from_slice(sep.as_bytes());
        buf.extend_from_slice(self.path.as_bytes());
        buf.extend_from_slice(sep.as_bytes());

        let mut parts = Vec::new();
        for (k, v) in &self.params {
            let mut part = Vec::new();
            part.extend_from_slice(k.as_bytes());
            part.push(b'=');
            part.extend_from_slice(v);
            parts.push(part);
        }

        let joined = parts.join(&b"&"[..]);
        buf.extend_from_slice(&joined);
        buf
    }

    pub fn build(mut self) -> Result<BTreeMap<String, String>, String> {
        let hmac_key = b"2tBeoEyJTunmWUGq7bQH2Abn0k2NhhurOaqBfyxCuLVgn4AVj7swcawe53uDUno";
        
        // 1. Calculate sign
        let p_nl = self.getp("\n");
        let mut mac = HmacSha1::new_from_slice(hmac_key).map_err(|e| e.to_string())?;
        mac.update(&p_nl);
        let sign_hex = hex::encode(mac.finalize().into_bytes());
        self.params.insert("sign".to_string(), sign_hex.into_bytes());

        // 2. Encrypt params
        let aes_key = STANDARD.decode(&self.ssecurity).map_err(|e| e.to_string())?;
        let aes_iv = b"0102030405060708";
        
        let mut encrypted_params = BTreeMap::new();
        for (k, v) in &self.params {
            let encrypted = encrypt_aes_cbc(&aes_key, aes_iv, v)?;
            encrypted_params.insert(k.clone(), STANDARD.encode(&encrypted));
        }

        // 3. Calculate signature
        let mut p_amp = self.getp("&");
        p_amp.extend_from_slice(b"&");
        p_amp.extend_from_slice(self.ssecurity.as_bytes());
        let mut hasher = Sha1::new();
        hasher.update(&p_amp);
        let signature = STANDARD.encode(hasher.finalize());
        
        encrypted_params.insert("signature".to_string(), signature);
        Ok(encrypted_params)
    }
}

pub fn decrypt_response(ssecurity: &str, base64_resp: &str) -> Result<serde_json::Value, String> {
    let aes_key = STANDARD.decode(ssecurity).map_err(|e| e.to_string())?;
    let aes_iv = b"0102030405060708";
    let encrypted_data = STANDARD.decode(base64_resp).map_err(|e| format!("Base64 Error: {}", e))?;
    let decrypted = decrypt_aes_cbc(&aes_key, aes_iv, &encrypted_data)?;

    let json_str = String::from_utf8(decrypted).map_err(|e| e.to_string())?;
    let parsed: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
    Ok(parsed)
}

fn generate_nonce() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_nanos();
    let mut hex = format!("{:016x}", now);
    hex.truncate(16);
    hex
}

#[derive(Clone, Serialize, Deserialize)]
pub struct MiUnlockSession {
    pub pass_token: String,
    pub service_token: String,
    pub user_id: String,
    pub device_id: String,
    pub ssecurity: String,
    pub location_url: String,
    pub nonce: String,
}

#[derive(Serialize)]
pub struct UnlockResult {
    pub product: String,
    pub code: i32,
    pub desc: String,
    pub encrypt_data: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct FastbootDeviceInfo {
    pub product: String,
    pub token: String,
}

#[tauri::command]
pub async fn get_fastboot_device_info(handle: tauri::AppHandle) -> Result<FastbootDeviceInfo, String> {
    use crate::config::get_fastboot_path;
    let fb = get_fastboot_path(&handle);

    // Get product
    let output_prod = tokio::process::Command::new(&fb)
        .args(["getvar", "product"])
        .output()
        .await
        .map_err(|e| format!("Failed to run fastboot: {}", e))?;
    
    let stderr_prod = String::from_utf8_lossy(&output_prod.stderr).to_string();
    let product = stderr_prod.lines()
        .find(|l| l.contains("product:"))
        .and_then(|l| l.split("product:").nth(1))
        .map(|s| s.trim().to_string())
        .ok_or_else(|| format!("Could not find product info. Stderr: {}", stderr_prod))?;

    // Get token
    // Try 'oem get_token' first (Mediatek)
    let output_token_mtk = tokio::process::Command::new(&fb)
        .args(["oem", "get_token"])
        .output()
        .await
        .map_err(|e| format!("Failed to run fastboot: {}", e))?;
    
    let stderr_mtk = String::from_utf8_lossy(&output_token_mtk.stderr).to_string();
    let mut token = stderr_mtk.lines()
        .find(|l| l.contains("token:"))
        .and_then(|l| l.split("token:").nth(1))
        .map(|s| s.trim().to_string());

    if token.is_none() {
        // Try 'getvar token' (Qualcomm)
        let output_token_qcom = tokio::process::Command::new(&fb)
            .args(["getvar", "token"])
            .output()
            .await
            .map_err(|e| format!("Failed to run fastboot: {}", e))?;
        
        let stderr_qcom = String::from_utf8_lossy(&output_token_qcom.stderr).to_string();
        token = stderr_qcom.lines()
            .find(|l| l.contains("token:"))
            .and_then(|l| l.split("token:").nth(1))
            .map(|s| s.trim().to_string());
    }

    let token = token.ok_or_else(|| "Could not find device token. Is the device in fastboot mode?".to_string())?;

    Ok(FastbootDeviceInfo { product, token })
}

#[tauri::command]
pub async fn fastboot_unlock(handle: tauri::AppHandle, encrypt_data_hex: String) -> Result<String, String> {
    use crate::config::get_fastboot_path;
    let fb = get_fastboot_path(&handle);

    // Convert hex string back to bytes
    let data = hex::decode(encrypt_data_hex).map_err(|e| format!("Invalid hex data: {}", e))?;
    
    // Write to a temporary file
    let temp_path = std::env::temp_dir().join("encryptData");
    std::fs::write(&temp_path, data).map_err(|e| format!("Failed to write temp file: {}", e))?;

    // 1. fastboot stage encryptData
    let output_stage = tokio::process::Command::new(&fb)
        .args(["stage", temp_path.to_str().unwrap()])
        .output()
        .await
        .map_err(|e| format!("Fastboot stage failed: {}", e))?;

    if !output_stage.status.success() {
        return Err(format!("Fastboot stage error: {}", String::from_utf8_lossy(&output_stage.stderr)));
    }

    // 2. fastboot oem unlock
    let output_unlock = tokio::process::Command::new(&fb)
        .args(["oem", "unlock"])
        .output()
        .await
        .map_err(|e| format!("Fastboot unlock failed: {}", e))?;

    // Cleanup
    let _ = std::fs::remove_file(temp_path);

    if output_unlock.status.success() {
        Ok("Device unlocked successfully! It should be rebooting now.".into())
    } else {
        Err(format!("Fastboot oem unlock error: {}", String::from_utf8_lossy(&output_unlock.stderr)))
    }
}

#[tauri::command]
pub async fn exec_mi_unlock(
    session: MiUnlockSession,
    product: String,
    token: String,
    region: String,
) -> Result<UnlockResult, String> {
    let base_domain = "unlock.update.intl.miui.com";
    let url_host = match region.to_lowercase().as_str() {
        "china" => base_domain.replace("intl.", ""),
        "india" => format!("in-{}", base_domain),
        "russia" => format!("ru-{}", base_domain),
        "europe" => format!("eu-{}", base_domain),
        _ => base_domain.to_string(),
    };

    let client = reqwest::Client::new();
    let cookie_str = format!(
        "passToken={}; serviceToken={}; userId={}; deviceId={}",
        session.pass_token, session.service_token, session.user_id, session.device_id
    );

    use md5;
    let pc_id = format!("{:x}", md5::compute(session.device_id.as_bytes()));

    // Stage 1: Device clear check
    let mut stage1 = RetrieveEncryptData::new("/api/v2/unlock/device/clear", &session.ssecurity);
    stage1.set_param("nonce", &session.nonce);
    stage1.set_param("sid", "miui_unlocktool_client");
    stage1.set_json_param("data", &serde_json::json!({
        "product": product
    }));

    let stage1_path = stage1.path.clone();
    let params = stage1.build()?;
    let path = format!("https://{}{}", url_host, stage1_path);
    let resp = client.post(&path)
        .header("User-Agent", "Mozilla/5.0")
        .header("Cookie", &cookie_str)
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let _resp_text = resp.text().await.map_err(|e| e.to_string())?;
    // We can decrypt if we want, but it's just 'cleanOrNot' notice, passing it.
    
    // Stage 2: AhaUnlock
    let mut stage2 = RetrieveEncryptData::new("/api/v3/ahaUnlock", &session.ssecurity);
    stage2.set_param("nonce", &session.nonce); // wait, MiUnlockTool.py generates a new nonce each time? 
    // `{"r":''.join(random.choices(list("abcdefghijklmnopqrstuvwxyz"), k=16)), "sid":"miui_unlocktool_client"}`
    // It calls `/api/v2/nonce` to get a fresh nonce before AHA unlock. Let's do that.
    
    let nonce_resp = client.post(format!("https://{}/api/v2/nonce", url_host))
        .header("User-Agent", "Mozilla/5.0")
        .header("Cookie", &cookie_str)
        .form(&[("r", generate_nonce()), ("sid", "miui_unlocktool_client".to_string())])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    #[derive(Deserialize)]
    struct NonceResponse {
        nonce: String,
    }
    let n_json: NonceResponse = nonce_resp.json().await.map_err(|e| e.to_string())?;
    let fresh_nonce = n_json.nonce;

    stage2.set_param("nonce", &fresh_nonce);
    stage2.set_param("sid", "miui_unlocktool_client");
    stage2.set_param("appId", "1");
    stage2.set_json_param("data", &serde_json::json!({
        "clientId": "2",
        "clientVersion": "7.6.727.43",
        "language": "en",
        "operate": "unlock",
        "pcId": pc_id,
        "product": product,
        "region": "",
        "deviceInfo": {
            "boardVersion": "",
            "product": product,
            "socId": "",
            "deviceName": ""
        },
        "deviceToken": token
    }));

    let stage2_path = stage2.path.clone();
    let ssecurity = stage2.ssecurity.clone();
    let params2 = stage2.build()?;
    let path2 = format!("https://{}{}", url_host, stage2_path);
    let resp2 = client.post(&path2)
        .header("User-Agent", "Mozilla/5.0")
        .header("Cookie", &cookie_str)
        .form(&params2)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let resp_text2 = resp2.text().await.map_err(|e| e.to_string())?;
    let final_json = decrypt_response(&ssecurity, &resp_text2)?;

    let code = final_json["code"].as_i64().unwrap_or(-1) as i32;
    let desc = final_json["descEN"].as_str().unwrap_or("Unknown").to_string();
    let encrypt_data = final_json["encryptData"].as_str().map(|s| s.to_string());

    Ok(UnlockResult {
        product,
        code,
        desc,
        encrypt_data,
    })
}

#[tauri::command]
pub async fn capture_mi_session_backend(sts_url: String) -> Result<MiUnlockSession, String> {
    use reqwest::cookie::CookieStore;

    // We use a dedicated cookie jar for this request to capture cookies set by the STS redirect
    let jar = std::sync::Arc::new(reqwest::cookie::Jar::default());
    let client = reqwest::Client::builder()
        .cookie_store(true)
        .cookie_provider(jar.clone())
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    // Perform the STS request. This will set the session cookies (userId, serviceToken, ssecurity)
    let _resp = client.get(&sts_url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .map_err(|e| format!("STS request failed: {}", e))?;

    let url = "https://unlock.update.miui.com".parse::<reqwest::Url>().unwrap();
    let cookie_values = jar.cookies(&url).ok_or("No cookies found in store")?;
    let cookie_str = cookie_values.to_str().unwrap_or_default().to_string();

    let mut session = MiUnlockSession {
        pass_token: String::new(),
        service_token: String::new(),
        user_id: String::new(),
        device_id: String::new(),
        ssecurity: String::new(),
        location_url: sts_url.clone(),
        nonce: String::new(),
    };

    // Parse cookies from the HeaderValue string
    for part in cookie_str.split(';') {
        let part_trimmed = part.trim();
        if let Some(pos) = part_trimmed.find('=') {
            let key = &part_trimmed[..pos];
            let val = &part_trimmed[pos + 1..];
            match key {
                "userId" => session.user_id = val.to_string(),
                "serviceToken" => session.service_token = val.to_string(),
                "passToken" => session.pass_token = val.to_string(),
                "ssecurity" => session.ssecurity = val.to_string(),
                _ => {}
            }
        }
    }

    // Extract nonce from URL
    if let Ok(parsed_url) = reqwest::Url::parse(&sts_url) {
        if let Some((_, nonce)) = parsed_url.query_pairs().find(|(k, _)| k == "nonce") {
            session.nonce = nonce.to_string();
        }
    }

    if session.user_id.is_empty() || session.ssecurity.is_empty() {
        return Err("Failed to extract session data from cookies. Are you logged in?".to_string());
    }

    Ok(session)
}

#[tauri::command]
pub async fn open_mi_login(handle: AppHandle) -> Result<(), String> {
    // Official callback URL that contains session tokens (nonce, _ssign) after login
    let login_url = "https://account.xiaomi.com/pass/serviceLogin?sid=unlockApi&callback=https://unlock.update.miui.com/sts&passive=false&hidden=false";
    
    let handle_clone = handle.clone();
    let _window = tauri::WebviewWindowBuilder::new(
        &handle,
        "mi-login",
        tauri::WebviewUrl::External(login_url.parse().unwrap())
    )
    .title("Xiaomi Account Login")
    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    .initialization_script(r#"
        (function() {
          console.log('Mi Scraper Initialized');
          setInterval(() => {
            const cookies = document.cookie;
            const body = document.body ? document.body.innerText : '';
            
            // Check for signs of success in cookies or body
            if (cookies.includes('userId') && (cookies.includes('serviceToken') || cookies.includes('ssecurity'))) {
              window.__TAURI__.event.emit('mi-raw-data', {
                type: 'cookies',
                data: cookies,
                url: window.location.href
              });
            }

            if (body.includes('&&&START&&&') || (body.includes('userId') && body.includes('ssecurity'))) {
               window.__TAURI__.event.emit('mi-raw-data', {
                type: 'body',
                data: body,
                url: window.location.href
              });
            }
          }, 2000);
        })();
    "#)
    .inner_size(520.0, 720.0)
    .resizable(true)
    .always_on_top(true)
    .on_navigation(move |url: &tauri::Url| {
        let url_str = url.as_str().to_string();
        if url_str.contains("unlock.update.miui.com/sts") {
            println!("Mi Unlock Redirect Detected: {}", url_str);
            // Just emit the URL to the frontend. Frontend will wait and fetch session.
            let _ = handle_clone.emit("mi-login-success", url_str);
        }
        true
    })
    .build()
    .map_err(|e| format!("Failed to create login window: {}", e))?;

    Ok(())
}
