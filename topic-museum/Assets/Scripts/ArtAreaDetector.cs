using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;

[RequireComponent(typeof(Collider))] 
public class ArtAreaDetector : MonoBehaviour
{
    bool isActive = false;

    ArtTextureLoader textureLoader;

    [DllImport("__Internal")]
    private static extern void EnterArtArea(int index);
    [DllImport("__Internal")]
    private static extern void ExitArtArea(int index);
    [DllImport("__Internal")]
    private static extern void SelectArtArea(int index);

    void Start() {
        textureLoader = transform.parent.GetComponent<ArtTextureLoader>();
    }

    private void OnTriggerEnter(Collider other) {
        isActive = true;
        textureLoader.material.color = Color.yellow;
        #if UNITY_WEBGL && !UNITY_EDITOR
        EnterArtArea(textureLoader.GetIndex());
        #endif
    }

    private void OnTriggerExit(Collider other) {
        isActive = false;
        textureLoader.material.color = Color.white;
        #if UNITY_WEBGL && !UNITY_EDITOR
        ExitArtArea(textureLoader.GetIndex());
        #endif
    }

    // Update is called once per frame
    void Update()
    {
        if (Input.GetMouseButtonDown(0) && isActive) {
            #if UNITY_WEBGL && !UNITY_EDITOR
            SelectArtArea(textureLoader.GetIndex());
            #endif
        }
    }
}
