<p align="center">
  <img src="assets/logo.svg" alt="">
</p>

![GitHub](https://img.shields.io/github/license/spaghiajoeojo/express-beans)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/spaghiajoeojo/express-beans/badges/quality-score.png?b=main)](https://scrutinizer-ci.com/g/spaghiajoeojo/express-beans/?branch=main)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/spaghiajoeojo/express-beans/express)
![GitHub package.json dependency version (dev)](https://img.shields.io/github/package-json/dependency-version/spaghiajoeojo/express-beans/dev/typescript)
[![Build Status](https://scrutinizer-ci.com/g/spaghiajoeojo/express-beans/badges/build.png?b=main)](https://scrutinizer-ci.com/g/spaghiajoeojo/express-beans/build-status/main)

[![SonarCloud](https://sonarcloud.io/images/project_badges/sonarcloud-orange.svg)](https://sonarcloud.io/summary/new_code?id=express-beans)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=express-beans&metric=coverage)](https://sonarcloud.io/summary/new_code?id=express-beans)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=express-beans&metric=bugs)](https://sonarcloud.io/summary/new_code?id=express-beans)

# ExpressBeans
ExpressBeans is the IoC Container (Inversion of Control Container) that you didn't know you needed.
If you love Node.js and the Spring Boot way of code organization this lightweight framework is for you.
ExpressBeans is an almost zero dependency framework (it wraps Express.js) to offer an easy-to-use way of building your next Express project.

## Get started
Try ExpressBeans with the official generator:
```console
npm create express-beans-server
```

## Documentation
API docs and types available in [documentation](https://spaghiajoeojo.github.io/express-beans/).

## Usage
All you need is create an ExpressBeans application and provide your `RouterBean` classes:
```ts
ExpressBeans.createApp({
  routerBeans: [
    ExampleRouter,
  ],
});

/* ======== OR ======== */

const application = new ExpressBeans({
  routerBeans: [
    ExampleRouter,
  ],
});
```

If you need also direct access to `express` application:
```ts
const application = new ExpressBeans({
  routerBeans: [
    ExampleRouter,
  ],
});
const expressApp = application.getApp();
```

## Typescript 5
New decorators are here and ExpressBeans implements some simple decorators to achieve dependency injection and endpoint registration.

### Example

```ts
import { Request, Response } from 'express';
import { InjectBean, Route, RouterBean } from 'express-beans';
import ExampleService from '../services/ExampleService';

@RouterBean('/example')
export default class ExampleRouter {
  @InjectBean(ExampleService)
  private exampleService: ExampleService;

  @Route('GET', '/hello')
  getHello(_req: Request, res: Response) {
    res.end(this.exampleService.example());
  }
}
```
This will create a new router that expose an endpoint `GET /example/hello` and
`exampleService` will be the instance of the class declared as it follow:
```ts
import { Bean } from 'express-beans';

@Bean
export default class ExampleService {
  private msg: string;

  constructor() {
    this.msg = 'hello world!';
  }

  example() {
    return this.msg;
  }
}
```
## Installation

```console
npm install express-beans
```
