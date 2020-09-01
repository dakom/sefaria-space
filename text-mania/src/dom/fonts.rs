use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    type FontFaceObserver;

    #[wasm_bindgen(constructor)]
    fn new(arg: &str) -> FontFaceObserver;

    #[wasm_bindgen(method)]
    pub async fn load(this:&FontFaceObserver);
}

pub async fn init() {
    let font = FontFaceObserver::new("TaameyFrankCLM");
    font.load().await;
}
