Main setup:
```
{
  name: "webRTC-matches",
  history_days: 0,
  ttl_days: 1
}
```

Index ensuring unique ID:
```
{
  name: "unique-id",
  unique: true,
  serialized: true,
  source: "webRTC-matches",
  terms: [
    {
      field: ["data", "id"]
    }
  ]
}
```

Index making querying easier:
```
{
  name: "match",
  unique: true,
  serialized: true,
  source: "webRTC-matches",
  terms: [
    {
      field: ["data", "id"]
    },
    {
      field: ["data", "answer"]
    }
  ]
}
```