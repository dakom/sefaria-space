using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using System.Runtime.InteropServices;

struct MenuCanvasInfo {
    public int width;
    public int height;
}

[RequireComponent(typeof(MeshRenderer), typeof(MeshFilter))]
public class TopicTextureLoader : MonoBehaviour
{

    MenuCanvasInfo info;

    [DllImport("__Internal")]
    private static extern void SetTopicTexture(int texture, int width, int height);

    void Start() {
        SetInfo();
        
        #if UNITY_WEBGL && !UNITY_EDITOR
            SetTextureJs();
        #endif
        //Deprecated
        //StartCoroutine(GetTextureRemote("https://storage.googleapis.com/sefaria-space-media/image-cache/ff822090-cade-11ea-b285-f77534b7404c.jpg"));
    }

    void SetInfo() {
        var bounds = GetComponent<MeshFilter>().mesh.bounds;

        //I think the 8.0f is because of the original model scale...
        //Also notice that bounds uses z instead of y
        //and we also applied local scaling here

        info.width = (int) (bounds.size.y * 8 * transform.localScale.x * 100);
        info.height = (int) (bounds.size.z * 8 * transform.localScale.y * 100);

        Debug.LogFormat("{0}x{1}", info.width, info.height);
    }

    #if UNITY_WEBGL
    void SetTextureJs() {
        var texture = new Texture2D(info.width, info.height, TextureFormat.RGBA32, false);
        SetTopicTexture((int) texture.GetNativeTexturePtr(), info.width, info.height);
        Material material = GetComponent<MeshRenderer>().material;
        material.mainTexture = texture;
        //material.SetTextureScale("_MainTex", new Vector2(1, -1));
    }
    #endif

    //Deprecated
    /*
    IEnumerator GetTextureRemote(string url) {
        UnityWebRequest www = UnityWebRequestTexture.GetTexture(url);
        yield return www.SendWebRequest();

        if(www.isNetworkError || www.isHttpError) {
            Debug.Log(www.error);
        }
        else {
            Texture texture = ((DownloadHandlerTexture)www.downloadHandler).texture;
            Material material = GetComponent<MeshRenderer>().material;
            material.SetTextureScale("_MainTex", new Vector2(1, -1));
            material.mainTexture = texture;
        }
    }
    */
}