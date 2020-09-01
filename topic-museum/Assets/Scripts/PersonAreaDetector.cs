using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;

[RequireComponent(typeof(Collider))] 

public class PersonAreaDetector : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void EnterPersonArea();
    [DllImport("__Internal")]
    private static extern void ExitPersonArea();
    [DllImport("__Internal")]
    private static extern void SelectPersonArea();

    bool isActive = false;
    void Awake() {
        isActive = false;
    }
    // Start is called before the first frame update
    void Start()
    {
    }

    private void OnTriggerEnter(Collider other) {
        isActive = true;

        #if UNITY_WEBGL && !UNITY_EDITOR
        EnterPersonArea();
        #endif
    }

    private void OnTriggerExit(Collider other) {
        isActive = false;
        #if UNITY_WEBGL && !UNITY_EDITOR
        ExitPersonArea();
        #endif
    }

    // Update is called once per frame
    void Update()
    {
        if (Input.GetMouseButtonDown(0) && isActive) {
            #if UNITY_WEBGL && !UNITY_EDITOR
            SelectPersonArea();
            #endif
        }
    }
}
