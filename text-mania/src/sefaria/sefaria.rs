use wasm_bindgen::prelude::*;
use serde::Deserialize;
use awsm_web::loaders::fetch::fetch_url;
use crate::config::LETTERS;
#[derive(Deserialize)]
struct SefariaResponse {
    he: Vec<String>,
    next: Option<String>
}
pub struct SefariaRef {
    pub letters: Vec<usize>,
    pub index: usize,
    pub next: Option<String>
}



impl SefariaRef {
    pub async fn load(ref_id:&str)-> Self {
        let resp:SefariaResponse = fetch_url(&format!("https://www.sefaria.org/api/texts/{}", ref_id))
            .await
            .unwrap_throw()
            .json_from_str()
            .await
            .unwrap_throw();

        let lines:Vec<Vec<Vec<usize>>> = 
            resp.he
                .into_iter()
                .map(|s| {
                    s.split(' ')
                        .into_iter()
                        .map(|s| {
                            s.chars()
                                .into_iter()
                                .map(get_index)
                                .filter(|x| x.is_some())
                                .map(|x| x.unwrap_throw())
                                .collect()
                        })
                        .collect()

                })
                .collect();

        let letters:Vec<usize> = 
            lines
                .into_iter()
                .flatten()
                .into_iter()
                .flatten()
                .collect();

        Self {
            letters,
            index: 0,
            next: resp.next,
        }
    }

    pub fn new() -> Self {
        Self {
            letters: Vec::new(),
            index: 0,
            next: None, 
        }
    }

    pub fn get_letter(&mut self) -> Option<usize> {
        if self.index < self.letters.len() {
            let letter = self.letters[self.index];
            self.index += 1;
            Some(letter)
        } else {
            None
        }
    }
}

fn get_index(c:char) -> Option<usize> {
    LETTERS
        .iter()
        .position(|x| *x == c)
}
