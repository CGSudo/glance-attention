use anyhow::{Context, Result, bail};
use glance_core::{
    Engine,
    infer::{ContentType, MAX_UPLOAD, read_image},
    metrics::Aoi,
};
use serde_json::{Value, json};
use std::{
    io::{self, BufRead, Read, Write},
    path::Path,
};

fn tools() -> Value {
    json!({"tools":[
        {"name":"analyze_image","description":"Predict attention for a local image. AOI coordinates: 0–100 percentages.","inputSchema":{"type":"object","properties":{"path":{"type":"string"},"model":{"type":"string"},"content_type":{"type":"string","enum":["natural","ecommerce","ui"],"default":"natural"},"aois":{"type":"array","items":{"type":"object"}}},"required":["path"],"additionalProperties":false}},
        {"name":"compare_images","description":"Compare local images; deltas are B minus A.","inputSchema":{"type":"object","properties":{"a":{"type":"string"},"b":{"type":"string"},"model":{"type":"string"},"content_type":{"type":"string","enum":["natural","ecommerce","ui"],"default":"natural"}},"required":["a","b"],"additionalProperties":false}},
        {"name":"list_models","description":"List available models and installation status.","inputSchema":{"type":"object","properties":{},"additionalProperties":false}}
    ]})
}

fn string<'a>(value: &'a Value, key: &str) -> Result<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .with_context(|| format!("'{key}' must be a string"))
}

fn call(engine: &mut Engine, params: &Value) -> Result<Value> {
    let name = string(params, "name")?;
    let empty = json!({});
    let args = params.get("arguments").unwrap_or(&empty);
    if !args.is_object() {
        bail!("arguments must be an object");
    }
    let model = args
        .get("model")
        .map(|v| v.as_str().context("model must be a string"))
        .transpose()?;
    let content_type: ContentType = args
        .get("content_type")
        .map(|value| serde_json::from_value(value.clone()))
        .transpose()?
        .unwrap_or_default();
    match name {
        "list_models" => Ok(serde_json::to_value(engine.registry.list())?),
        "analyze_image" => {
            let aois: Vec<Aoi> = args
                .get("aois")
                .map(|v| serde_json::from_value(v.clone()))
                .transpose()?
                .unwrap_or_default();
            Ok(serde_json::to_value(
                engine.analyze_path_with_content_type(
                    Path::new(string(args, "path")?),
                    model,
                    &aois,
                    content_type,
                )?,
            )?)
        }
        "compare_images" => Ok(serde_json::to_value(engine.compare_with_content_type(
            &read_image(Path::new(string(args, "a")?))?,
            &read_image(Path::new(string(args, "b")?))?,
            model,
            &[],
            content_type,
        )?)?),
        _ => bail!("unknown tool '{name}'"),
    }
}

fn error(id: Value, code: i32, message: &str) -> Value {
    json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":message}})
}

fn handle(engine: &mut Engine, request: Value) -> Option<Value> {
    let id = request.get("id").cloned().unwrap_or(Value::Null);
    if request.get("jsonrpc") != Some(&json!("2.0"))
        || !request.get("method").is_some_and(Value::is_string)
        || (!id.is_null() && !id.is_string() && !id.is_i64() && !id.is_u64())
    {
        return Some(error(id, -32600, "invalid JSON-RPC request"));
    }
    request.get("id")?;
    let params = request.get("params").cloned().unwrap_or_else(|| json!({}));
    let result = match request["method"].as_str().unwrap_or_default() {
        "initialize" => {
            let requested = params["protocolVersion"].as_str().unwrap_or_default();
            let version =
                if ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"].contains(&requested) {
                    requested
                } else {
                    "2025-11-25"
                };
            json!({"protocolVersion":version,"capabilities":{"tools":{}},"serverInfo":{"name":"glance","version":env!("CARGO_PKG_VERSION")}})
        }
        "ping" => json!({}),
        "tools/list" => tools(),
        "tools/call" => match call(engine, &params) {
            Ok(value) => {
                let mut result =
                    json!({"content":[{"type":"text","text":value.to_string()}],"isError":false});
                if value.is_object() {
                    result["structuredContent"] = value;
                }
                result
            }
            Err(e) => json!({"content":[{"type":"text","text":e.to_string()}],"isError":true}),
        },
        _ => return Some(error(id, -32601, "method not found")),
    };
    Some(json!({"jsonrpc":"2.0","id":id,"result":result}))
}

pub fn serve(engine: &mut Engine) -> Result<()> {
    let stdin = io::stdin();
    let mut input = stdin.lock();
    let mut output = io::stdout().lock();
    loop {
        let mut line = String::new();
        let n = (&mut input)
            .take((MAX_UPLOAD + 1) as u64)
            .read_line(&mut line)?;
        if n == 0 {
            break;
        }
        if n > MAX_UPLOAD {
            bail!("MCP message exceeds 25 MB");
        }
        let response = match serde_json::from_str(&line) {
            Ok(request) => handle(engine, request),
            Err(_) => Some(error(Value::Null, -32700, "invalid JSON")),
        };
        if let Some(response) = response {
            serde_json::to_writer(&mut output, &response)?;
            writeln!(output)?;
            output.flush()?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn protocol_lists_tools_and_reports_call_errors() {
        let dir = std::env::temp_dir().join(format!("glance-mcp-{}", std::process::id()));
        let mut engine =
            Engine::new(glance_core::registry::Registry::from_models(vec![], dir).unwrap())
                .unwrap();
        let list = handle(
            &mut engine,
            json!({"jsonrpc":"2.0","id":1,"method":"tools/list"}),
        )
        .unwrap();
        assert_eq!(list["result"]["tools"].as_array().unwrap().len(), 3);
        assert_eq!(
            list["result"]["tools"][0]["inputSchema"]["properties"]["content_type"]["enum"],
            json!(["natural", "ecommerce", "ui"])
        );
        let invalid = call(&mut engine, &json!({"name":"analyze_image", "arguments":{"path":"missing.png", "content_type":"salicon"}})).unwrap_err();
        assert!(invalid.to_string().contains("unknown variant"));
        let response=handle(&mut engine,json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"analyze_image","arguments":{"path":"missing.png"}}})).unwrap();
        assert_eq!(response["result"]["isError"], true);
        assert!(
            handle(
                &mut engine,
                json!({"jsonrpc":"2.0","method":"notifications/initialized"})
            )
            .is_none()
        );
        assert_eq!(
            handle(
                &mut engine,
                json!({"jsonrpc":"2.0","id":3,"method":"bogus"})
            )
            .unwrap()["error"]["code"],
            -32601
        );
    }
}
