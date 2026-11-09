#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ===== Wi-Fi 설정 =====
const char* WIFI_SSID     = "MyPhone";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← 여기에 핫스팟 비밀번호를 입력하세요

// ===== Supabase 설정 (.env 값) =====
const char* SUPABASE_URL      = "https://cycjiryojocaoxfcincu.supabase.co";
const char* SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ===== 센서 설정 =====
const int SENSOR_PIN = 34;                  // 센서가 연결된 아날로그 핀
const unsigned long SEND_INTERVAL_MS = 1000;

unsigned long lastSendMs = 0;

float readSensor() {
  // 기존 스케치의 센서 읽기 코드로 바꿔도 됩니다.
  return analogRead(SENSOR_PIN);
}

void connectWiFi() {
  Serial.printf("Wi-Fi 연결 중: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi 연결됨, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.printf("Wi-Fi 연결 실패 (status=%d)\n", WiFi.status());
  }
}

void sendReading(float value) {
  WiFiClientSecure client;
  client.setInsecure();  // 인증서 검증 생략 (프로토타입용)

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/readings";
  if (!http.begin(client, url)) {
    Serial.println("HTTP 연결 시작 실패");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  String body = String("{\"value\":") + String(value, 2) + "}";
  int code = http.POST(body);

  if (code > 0) {
    Serial.printf("POST value=%.2f → 응답 코드 %d\n", value, code);
    if (code != 201) {
      Serial.println(http.getString());
    }
  } else {
    Serial.printf("POST 실패: %s\n", http.errorToString(code).c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(9600);
  delay(500);
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi 끊김, 재연결 시도");
    connectWiFi();
    return;
  }

  if (millis() - lastSendMs >= SEND_INTERVAL_MS) {
    lastSendMs = millis();
    sendReading(readSensor());
  }
}
