using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;

public class ContextStartup : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SetContext();
    void Awake() {

        #if UNITY_WEBGL && !UNITY_EDITOR
        SetContext();
        #endif
    }
}
