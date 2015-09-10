# Ionic Analytics Service Module

Track user actions and other custom metrics in your app.
Check out our [docs](http://docs.ionic.io/v1.0/docs/analytics-overview) for more detailed information.

## Installation

Using the latest [Ionic CLI](https://github.com/driftyco/ionic-cli):

1.  Run `ionic add ionic-service-core`
2.  Run `ionic add ionic-service-analytics`

## Example Usage

```javascript

Ionic.io(); // Initialize the Ionic Platform

// Initialize the Analytics Service
var analytics = Ionic.Analytics();

analytics.track("myEvent", { "fooData": "foo", "barCount": 11 });
```

## Building

1. Install Dependencies `npm install`
2. Run `gulp build`

## Development

You can run `gulp watch` to continously build changes.

