import UIKit
import Capacitor
import Photos

@objc(PhotoLibraryPlugin)
class PhotoLibraryPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "PhotoLibraryPlugin"
    let jsName = "PhotoLibrary"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveImages", returnType: CAPPluginReturnPromise)
    ]

    @objc func saveImages(_ call: CAPPluginCall) {
        guard let images = call.getArray("images"), !images.isEmpty else {
            call.reject("没有可保存的图片")
            return
        }
        let imageData = images.compactMap { item -> Data? in
            guard let image = item as? [String: Any],
                  let encoded = image["data"] as? String else { return nil }
            return Data(base64Encoded: encoded)
        }
        guard imageData.count == images.count else {
            call.reject("图片内容不完整")
            return
        }
        save(imageData, call: call)
    }

    private func save(_ images: [Data], call: CAPPluginCall) {
        let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        if status == .notDetermined {
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { [weak self] result in
                DispatchQueue.main.async {
                    guard result == .authorized || result == .limited else {
                        call.reject("未获得添加到照片库的权限")
                        return
                    }
                    self?.write(images, call: call)
                }
            }
            return
        }
        guard status == .authorized || status == .limited else {
            call.reject("未获得添加到照片库的权限")
            return
        }
        write(images, call: call)
    }

    private func write(_ images: [Data], call: CAPPluginCall) {
        PHPhotoLibrary.shared().performChanges({
            for image in images {
                let request = PHAssetCreationRequest.forAsset()
                request.addResource(with: .photo, data: image, options: nil)
            }
        }) { success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve(["count": images.count])
                } else {
                    call.reject("保存到照片库失败", nil, error)
                }
            }
        }
    }
}

@objc(ThemeBridgePlugin)
class ThemeBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "ThemeBridgePlugin"
    let jsName = "ThemeBridge"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setTheme", returnType: CAPPluginReturnPromise)
    ]

    @objc func setTheme(_ call: CAPPluginCall) {
        let preference = call.getString("theme") ?? "system"
        let selected = ["system", "dark", "light"].contains(preference) ? preference : "system"
        DispatchQueue.main.async { [weak self] in
            (self?.bridge?.viewController as? MainViewController)?.applyNativeTheme(selected)
            call.resolve()
        }
    }
}

class MainViewController: CAPBridgeViewController {
    private let themePreferenceKey = "anjia_theme_preference"

    private var pageBackground: UIColor {
        let preference = UserDefaults.standard.string(forKey: themePreferenceKey) ?? "system"
        let isDark: Bool
        if preference == "dark" {
            isDark = true
        } else if preference == "light" {
            isDark = false
        } else {
            isDark = traitCollection.userInterfaceStyle == .dark
        }
        if isDark {
            return UIColor(red: 16.0 / 255.0,
                           green: 24.0 / 255.0,
                           blue: 40.0 / 255.0,
                           alpha: 1.0)
        }
        return UIColor(red: 245.0 / 255.0,
                       green: 248.0 / 255.0,
                       blue: 252.0 / 255.0,
                       alpha: 1.0)
    }

    func applyNativeTheme(_ preference: String) {
        UserDefaults.standard.set(preference, forKey: themePreferenceKey)
        let background = pageBackground
        view.backgroundColor = background
        bridge?.webView?.backgroundColor = background
        bridge?.webView?.scrollView.backgroundColor = background
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // 页面切换的短暂空档使用已保存的外观底色，避免露出相反颜色。
        view.backgroundColor = pageBackground
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PhotoLibraryPlugin())
        bridge?.registerPluginInstance(ThemeBridgePlugin())
        bridge?.webView?.isOpaque = false
        bridge?.webView?.backgroundColor = pageBackground
        bridge?.webView?.scrollView.backgroundColor = pageBackground
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if UserDefaults.standard.string(forKey: themePreferenceKey) ?? "system" == "system" {
            applyNativeTheme("system")
        }
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
