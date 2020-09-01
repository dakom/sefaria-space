using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;

[RequireComponent(typeof(Collider))] 

public class ExitAreaDetector : MonoBehaviour
{
    public GameObject exitSign;


    [DllImport("__Internal")]
    private static extern void EnterExitArea();
    [DllImport("__Internal")]
    private static extern void ExitExitArea();
    [DllImport("__Internal")]
    private static extern void SelectExitArea();

    void Awake() {
        exitSign.SetActive(false);
    }
    // Start is called before the first frame update
    void Start()
    {
    }

    private void OnTriggerEnter(Collider other) {
        exitSign.SetActive(true);

        #if UNITY_WEBGL && !UNITY_EDITOR
        EnterExitArea();
        #endif
    }

    private void OnTriggerExit(Collider other) {
        exitSign.SetActive(false);
        #if UNITY_WEBGL && !UNITY_EDITOR
        ExitExitArea();
        #endif
    }

    // Update is called once per frame
    void Update()
    {
        if (Input.GetMouseButtonDown(0) && exitSign.activeSelf) {
            #if UNITY_WEBGL && !UNITY_EDITOR
            SelectExitArea();
            #endif
        }
    }
}
