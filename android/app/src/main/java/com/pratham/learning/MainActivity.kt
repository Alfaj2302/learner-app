package com.pratham.learning

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "learnerapp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * react-native-screens (3.x) override.
   *
   * When Android recreates this Activity (config-change relaunch, "Don't keep activities", or
   * process death) the saved Bundle contains FragmentManager state for ScreenStackFragment /
   * ScreenFragment. Those fragments cannot be re-instantiated (their no-arg constructor throws
   * "Screen fragments should never be restored"), which crashes MainActivity on launch.
   *
   * React Native does not restore JS/UI state from this Bundle - React re-renders all screens -
   * so discarding it is safe. This is the documented setup for react-native-screens 3.x and
   * React Navigation 6. (RNScreensFragmentFactory is only available in react-native-screens
   * >= 4.16, which requires react-native >= 0.79.)
   * See https://github.com/software-mansion/react-native-screens/issues/17
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
