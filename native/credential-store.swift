import Foundation
import Security

// Secrets travel over stdin/stdout to the local service, never in process arguments or files.
func fail() -> Never { FileHandle.standardError.write(Data("credential_operation_failed\n".utf8)); exit(1) }
let bytes = FileHandle.standardInput.readDataToEndOfFile()
guard bytes.count <= 16384,
      let body = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
      let operation = body["operation"] as? String,
      let id = body["id"] as? String,
      UUID(uuidString: id) != nil else { fail() }
let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                           kSecAttrService as String: "CollegeNotes.AI",
                           kSecAttrAccount as String: id]
var output: [String: Any] = ["ok": true]
switch operation {
case "put":
    guard let secret = body["secret"] as? String, !secret.isEmpty, secret.utf8.count <= 8192 else { fail() }
    let update = [kSecValueData as String: Data(secret.utf8)]
    let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
    if status == errSecItemNotFound {
        var item = query
        item[kSecValueData as String] = Data(secret.utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { fail() }
    } else if status != errSecSuccess { fail() }
case "read":
    var lookup = query
    lookup[kSecReturnData as String] = true
    lookup[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(lookup as CFDictionary, &result)
    if status == errSecItemNotFound { output["secret"] = NSNull() }
    else {
        guard status == errSecSuccess, let data = result as? Data, let secret = String(data: data, encoding: .utf8) else { fail() }
        output["secret"] = secret
    }
case "remove":
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { fail() }
default: fail()
}
guard let data = try? JSONSerialization.data(withJSONObject: output) else { fail() }
FileHandle.standardOutput.write(data)
