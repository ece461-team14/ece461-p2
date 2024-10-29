// GitHubFile.ts
// Description: Defines the interface for a GitHub file object, representing metadata 
//              and links related to a file in a GitHub repository.
// Date: October 29, 2024
// Dependencies: None
// Contributors: (add contributors)

export interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: string;
    _links: {
      self: string;
      git: string;
      html: string;
    };
  }