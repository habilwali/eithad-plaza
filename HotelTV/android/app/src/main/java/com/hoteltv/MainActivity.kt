package com.hoteltv

import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.github.kevinejohn.keyevent.KeyEventModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Etihad Plaza Hotel"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * On Android TV, DPAD_CENTER (OK) is consumed by the focused view BEFORE onKeyDown
   * fires, so KeyEventModule / JS never receives it via onKeyDown.
   * dispatchKeyEvent fires first — we intercept OK keys here, forward them to JS,
   * and return true to prevent the native view from also triggering a click.
   */
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val kc = event.keyCode

    // These keys must be captured here (before the view system or onBackPressed
    // get a chance to consume them) and forwarded exclusively to JS:
    //  • DPAD_CENTER / ENTER / NUMPAD_ENTER / BUTTON_SELECT — consumed by focused
    //    views on Android TV before onKeyDown fires.
    //  • DPAD_LEFT / DPAD_RIGHT / DPAD_UP / DPAD_DOWN — forwarded so home screen
    //    and other screens can handle horizontal/vertical nav when no view has focus.
    //  • BACK — triggers onBackPressed() via super.onKeyUp, which fires BackHandler.
    //    Capturing BACK here stops onBackPressed from ever being called.
    val captureInJs = kc == KeyEvent.KEYCODE_DPAD_CENTER ||
                      kc == KeyEvent.KEYCODE_ENTER        ||
                      kc == KeyEvent.KEYCODE_NUMPAD_ENTER ||
                      kc == KeyEvent.KEYCODE_BACK         ||
                      kc == KeyEvent.KEYCODE_DPAD_LEFT    ||
                      kc == KeyEvent.KEYCODE_DPAD_RIGHT  ||
                      kc == KeyEvent.KEYCODE_DPAD_UP     ||
                      kc == KeyEvent.KEYCODE_DPAD_DOWN    ||
                      kc == 109 // KEYCODE_BUTTON_SELECT

    if (captureInJs) {
      val module = KeyEventModule.getInstance()
      if (module != null) {
        when (event.action) {
          KeyEvent.ACTION_DOWN -> module.onKeyDownEvent(kc, event)
          KeyEvent.ACTION_UP   -> module.onKeyUpEvent(kc, event)
        }
      }
      return true // consumed — JS is the sole handler
    }

    return super.dispatchKeyEvent(event)
  }

  // onKeyDown / onKeyUp forward uncaptured keys (e.g. media keys) to JS.
  // Captured keys (DPAD_*, ENTER, BACK) are handled above and never reach here.
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    KeyEventModule.getInstance()?.onKeyDownEvent(keyCode, event)
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    KeyEventModule.getInstance()?.onKeyUpEvent(keyCode, event)
    return super.onKeyUp(keyCode, event)
  }
}
