# Random number service

## Running tests

To run tests run the following commands:

```bash
make test
```

or

```bash
npm test
```

## Running the application

To run the application run the following commands:

```bash
make run
```

or

```bash
npm start
```

## Configuration

The application manages it's configuration via environment variables and employs the dotenv package to load the configuration from .env file.

By default the application listens to `0.0.0.0:8080`, but the port can be set via environment variable `PORT`. Eg.:

```bash
PORT=3000 npm start
```

Example .env file:

```
PORT=8080
CSRNG_URL=https://csrng.net/csrng/csrng.php?min=0&max=100
```
