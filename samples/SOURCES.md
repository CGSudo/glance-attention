# Parity samples

All three files are CC0 1.0, downloaded from Wikimedia Commons and converted to RGB PNG; longest edge resized to 1024 pixels with Pillow LANCZOS. No eye-tracking data included.

| File | Subject / creator | Source and license record |
|---|---|---|
| portrait.png | Face portrait; William Stitt, 19 October 2016 | [Commons](https://commons.wikimedia.org/wiki/File:Face_portrait_(Unsplash).jpg); original Unsplash image predates 5 June 2017 CC0 cutoff |
| webpage.png | Observation.org home page; Dyve, with website owner's approval | [Commons](https://commons.wikimedia.org/wiki/File:Observation-org-screenshot-home-2023-12-19-09-42-48.png) |
| product.png | Product photography of a leaf blower; Josh Root | [Commons](https://commons.wikimedia.org/wiki/File:Product_Photography_-_Pittsburg_Community_(51163419920).jpg); Flickr CC0 reviewed by Commons |

License for each image: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

`expected/<model>/*.png`: PyTorch reference heatmaps from `tools/export/parity.py`; 16-bit grayscale, brightest pixel = 65535. Probability maps are compared before PNG quantization. UNISAL video samples form a 3-frame sequence in portrait, webpage, product order; they are a recurrence check, not a video accuracy benchmark.
