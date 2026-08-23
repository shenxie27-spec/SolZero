# SolZero 加固规则：保留 MWA 钱包通信相关类
-keep class com.solanamobile.** { *; }
-keep class com.mobilewalletadapter.** { *; }
-keep class com.falkon.** { *; }
-keep class com.solana.** { *; }
-keep class org.bouncycastle.** { *; }
-dontwarn com.solanamobile.**
-dontwarn org.bouncycastle.**

# react-native-quick-crypto / 加密垫片
-keep class com.margelo.quickcrypto.** { *; }

# 反射相关
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
# 第三方 TurboModule 反射注册保护（R8 压缩下保持可用）
-keep class org.asyncstorage.** { *; }
-keep class com.margelo.** { *; }
-keep class com.quickbase64.** { *; }
-keep class * extends com.facebook.react.BaseReactPackage { *; }
-keep @com.facebook.react.module.annotations.ReactModule class * { *; }
-keepclassmembers @com.facebook.react.module.annotations.ReactModule class * { *; }
