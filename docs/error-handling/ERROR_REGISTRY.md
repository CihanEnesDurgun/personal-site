# 🚨 Error Registry (RFC 7807)

This document is the **Single Source of Truth** for all application errors in the personal site system. It follows the [RFC 7807 (Problem Details for HTTP APIs)](https://datatracker.ietf.org/doc/html/rfc7807) standard.

## 📌 Taxonomy Structure

Errors are categorized using an alphanumeric prefix followed by a 4-digit number:

- **`AUTH-1000`**: Authentication & Authorization (Login, tokens, permissions)
- **`VAL-2000`**: Validation & Bad Requests (Missing fields, malformed JSON)
- **`SYS-3000`**: System & Server (Internal crashes, DB read/write issues)
- **`SEC-4000`**: Security & Rate Limiting (CORS, Brute-force prevention)
- **`FILE-5000`**: File Operations (Upload limits, invalid extensions)
- **`RES-6000`**: Resource Operations (404 Not Found, 409 Conflicts)

### System Information Logs
- **`ENV-1000`**: Environment & Configuration (Variables, initial setups)
- **`SYS-2000`**: System Initialization & Operations (Managers, periodic tasks)
- **`SYS-8000`**: Server Lifecycle (Server boot, system states)

---

## 🔐 1. Authentication & Authorization (AUTH-1000)
| Code | HTTP Status | Title | Description / Detail |
| :--- | :--- | :--- | :--- |
| **`AUTH-1001`** | 401 | Unauthorized Access | Authentication is required to access this resource. |
| **`AUTH-1002`** | 401 | Token Expired | The provided authentication token has expired. |
| **`AUTH-1003`** | 401 | Invalid Token | The provided authentication token is invalid or malformed. |
| **`AUTH-1004`** | 401 | Invalid Credentials | The username or password provided is incorrect. |
| **`AUTH-1005`** | 403 | Forbidden | You do not have permission to perform this action. |
| **`AUTH-1006`** | 401 | Session Expired or Invalid | Your session has expired or is no longer valid. |

## ✍️ 2. Validation & Bad Requests (VAL-2000)
| Code | HTTP Status | Title | Description / Detail |
| :--- | :--- | :--- | :--- |
| **`VAL-2001`** | 400 | Validation Failed | One or more fields failed validation. Please check the provided data. |
| **`VAL-2002`** | 400 | Missing Required Field | A required field is missing from the request. |
| **`VAL-2003`** | 400 | Malformed Request | The request payload is malformed or cannot be parsed. |

## 🖥️ 3. System & Server Errors (SYS-3000)
| Code | HTTP Status | Title | Description / Detail |
| :--- | :--- | :--- | :--- |
| **`SYS-3001`** | 500 | Internal Server Error | An unexpected error occurred on the server. |
| **`SYS-3002`** | 500 | Data Read Error | Failed to read data from the storage system. |
| **`SYS-3003`** | 500 | Data Write Error | Failed to write data to the storage system. |

## 🛡️ 4. Security & Rate Limiting (SEC-4000)
| Code | HTTP Status | Title | Description / Detail |
| :--- | :--- | :--- | :--- |
| **`SEC-4001`** | 429 | Rate Limit Exceeded | Too many requests have been made from this IP address. |
| **`SEC-4002`** | 403 | CORS Policy Violation | The request violates Cross-Origin Resource Sharing policy. |

## 📁 5. File Operations (FILE-5000)
| Code | HTTP Status | Title | Description / Detail |
| :--- | :--- | :--- | :--- |
| **`FILE-5001`** | 413 | File Too Large | The uploaded file exceeds the maximum allowed size. |
| **`FILE-5002`** | 415 | Invalid File Type | The uploaded file type or extension is not permitted. |
| **`FILE-5003`** | 400 | No File Uploaded | No file was found in the upload request. |

## 📦 6. Resource Operations (RES-6000)
| Code | HTTP Status | Title | Description / Detail |
| :--- | :--- | :--- | :--- |
| **`RES-6001`** | 404 | Resource Not Found | The requested resource could not be found. |
| **`RES-6002`** | 409 | Resource Conflict | A conflict occurred, such as attempting to create a resource that already exists. |

---

## ℹ️ 7. System Information Logs (INFO/WARN)
These codes are used alongside standard logs to provide standardized filtering for server operations. They do not throw HTTP errors.

### 🌐 Environment & Configuration (ENV-1000)
| Code | Level | Description |
| :--- | :--- | :--- |
| **`ENV-1000`** | INFO | Cevresel degiskenler basariyla yuklendi |
| **`ENV-1001`** | INFO | JWT_SECRET: AYARLANDI |
| **`ENV-1002`** | INFO | BCRYPT_SALT_ROUNDS yuklendi |
| **`ENV-1003`** | INFO | NODE_ENV durumu belirlendi |
| **`ENV-1004`** | WARN | Gecersiz BCRYPT_SALT_ROUNDS degeri |

### ⚙️ System Initialization & Operations (SYS-2000)
| Code | Level | Description |
| :--- | :--- | :--- |
| **`SYS-2000`** | INFO | Oturum Yoneticisi (Session Manager) basariyla baslatildi |
| **`SYS-2001`** | ERROR| Oturum Yoneticisi (Session Manager) baslatilamadi |
| **`SYS-2003`** | INFO | Log Temizleme Yoneticisi (Cleanup Manager) basariyla baslatildi |
| **`SYS-2005`** | INFO | Istatistik veri dogrulamasi basariyla tamamlandi |
| **`SYS-2006`** | INFO | RSS akisi basariyla guncellendi |
| **`SYS-2008`** | INFO | Istatistik verileri dogrulaniyor... |
| **`SYS-2009`** | INFO | Oturum (session) verileri temizleniyor... |
| **`SYS-2012`** | INFO | Yazar tarafindan silinmis ancak istatistigi kalmis (yoksun/orphaned) yazi datalari bulundu |
| **`SYS-2013`** | INFO | Istatistik (stats) kaydi bulunmayan yeni yazilar tespit edildi |
| **`SYS-2014`** | INFO | Sitemap updated successfully |
| **`SYS-2015`** | INFO | Analytics data (all-time / daily) requested |
| **`SYS-2016`** | INFO | Statistics data cleaned successfully |

### 🔐 Authentication Logs (AUTH-8000)
| Code | Level | Description |
| :--- | :--- | :--- |
| **`AUTH-8000`** | INFO | Giris istegi alindi |
| **`AUTH-8001`** | INFO | Successful login |
| **`AUTH-8002`** | INFO | User logged out successfully |
| **`AUTH-8003`** | WARN | Access token is required |
| **`AUTH-8004`** | WARN | Invalid or expired token |
| **`AUTH-8005`** | WARN | Session validation failed, falling back to JWT |
| **`AUTH-8006`** | ERROR | Authentication system error |
| **`AUTH-8007`** | WARN | Failed login attempt |

### 📁 File Operation Logs (FILE-8000)
| Code | Level | Description |
| :--- | :--- | :--- |
| **`FILE-8000`** | INFO | Dosya basariyla hedef klasore tasindi |
| **`FILE-8001`** | INFO | Hedef klasore dosya yuklemesi basarili |

### 🚀 Server Lifecycle (SYS-8000)
| Code | Level | Description |
| :--- | :--- | :--- |
| **`SYS-8000`** | INFO | Personal Site - Admin API Sunucusu portunda calisiyor |
| **`SYS-8001`** | INFO | Guvenlik ve Oturum Yonetim Sistemi (Session Management) aktif |
| **`SYS-8002`** | INFO | Istatistik Veri Dogrulama ve Temizleme Sistemi aktif |
| **`SYS-8003`** | INFO | Otomatik Oturum Temizleme Sistemi aktif |

---

## 🛠️ Developer Guide

### Throwing an Error (Backend)
To throw a standard error anywhere in the backend:
```javascript
const { AppError } = require('./lib/errorHandler');

// Example: Missing fields
if (!title) {
    throw new AppError('VAL-2002', null, 'The title field is missing from the payload.');
}
```

### Response Format (Problem Details JSON)
The Global Error Handler will catch `AppError` and automatically format the HTTP response as `application/problem+json`:
```json
{
  "type": "https://cihanenesdurgun.com/docs/errors#VAL-2002",
  "title": "Missing Required Field",
  "status": 400,
  "detail": "A required field is missing from the request. Details: The title field is missing from the payload.",
  "instance": "/api/admin/blog",
  "requestId": "2b6db9a3f80c657a82b",
  "code": "VAL-2002"
}
```
*Note: The `code` field is a custom extension to the RFC 7807 standard to make parsing easier for the frontend `error-code-mapper.js`.*
