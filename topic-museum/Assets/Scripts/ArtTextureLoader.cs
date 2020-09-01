using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using System.Runtime.InteropServices;

struct CanvasInfo {
    public string section;
    public int relIndex;
    public int absIndex;
    public int width;
    public int height;

    public void Log() {
        Debug.LogFormat("section: {0} relIndex: {1} absIndex: {2} width: {3} height: {4}", section, relIndex, absIndex, width, height);
    }
}

[RequireComponent(typeof(MeshRenderer), typeof(MeshFilter))]
public class ArtTextureLoader : MonoBehaviour
{
    static Dictionary<string, int> _offsets = new Dictionary<string, int>
    {
        {"red_front", 0},
        {"stand_front", 6},
        {"far_wall", 12},
        {"red_back", 15},
        {"stand_back", 21},
        {"near_wall", 27},
    };

    CanvasInfo info;
    Texture texture;

    [HideInInspector]
    public Material material;

    [DllImport("__Internal")]
    private static extern void SetArtTexture(int texture, int index, int width, int height);

    void Start() {
        SetInfo();
        texture = new Texture2D(info.width, info.height, TextureFormat.RGBA32, false);
        #if UNITY_WEBGL && !UNITY_EDITOR
            SetArtTexture((int) texture.GetNativeTexturePtr(), info.absIndex, info.width, info.height);
            //material.SetTextureScale("_MainTex", new Vector2(1, -1));
        #endif
        //Debug.LogFormat("Texture: {0}", (int) texture.GetNativeTexturePtr());
        material = GetComponent<MeshRenderer>().material;
        material.mainTexture = texture;
        //material.color = Color.white;


        //Deprecated
        //StartCoroutine(GetTextureRemote("https://storage.googleapis.com/sefaria-space-media/image-cache/ff822090-cade-11ea-b285-f77534b7404c.jpg"));
    }

    public int GetIndex() {
        return this.info.absIndex;
    }

    void SetInfo() {
        var idx = this.name.LastIndexOf("_");

        info.section = this.name.Substring(0, idx);
        info.relIndex = int.Parse(this.name.Substring(idx+1));

        var offset = _offsets[info.section];

        info.absIndex = offset + info.relIndex;
        
        var bounds = GetComponent<MeshFilter>().mesh.bounds;

        //I think the 8.0f is because of the original model scale...
        //Also notice that bounds uses z instead of y

        info.width = (int) bounds.size.y * 8;
        info.height = (int) bounds.size.z * 8;
    }


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