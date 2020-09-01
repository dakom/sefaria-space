using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;

[RequireComponent(typeof(Collider))]
public class TopicAreaDetector : MonoBehaviour
{
    public GameObject particleEmitter;


    [DllImport("__Internal")]
    private static extern void EnterTopicArea();
    [DllImport("__Internal")]
    private static extern void ExitTopicArea();
    [DllImport("__Internal")]
    private static extern void SelectTopicArea();

    void Awake() {
        particleEmitter.SetActive(false);
    }
    // Start is called before the first frame update
    void Start()
    {
    }

    private void OnTriggerEnter(Collider other) {
        particleEmitter.SetActive(true);
        #if UNITY_WEBGL && !UNITY_EDITOR
        EnterTopicArea();
        #endif
    }

    private void OnTriggerExit(Collider other) {
        particleEmitter.SetActive(false);
        #if UNITY_WEBGL && !UNITY_EDITOR
        ExitTopicArea();
        #endif
    }

    // Update is called once per frame
    void Update()
    {
        if (Input.GetMouseButtonDown(0) && particleEmitter.activeSelf) {
            #if UNITY_WEBGL && !UNITY_EDITOR
            SelectTopicArea();
            #endif
        }
    }
}
